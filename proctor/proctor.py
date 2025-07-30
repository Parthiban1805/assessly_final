# This code is modified to be compatible with Python 3.7.
# The primary change is using py-webrtcvad instead of pyannote.
#proctor.py
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, request, jsonify
from flask_cors import CORS
from deepface import DeepFace
from resemblyzer import VoiceEncoder, preprocess_wav
# --- REMOVED: No longer needed ---
# from pyannote.audio import Pipeline 
from pathlib import Path
import numpy as np
import tempfile
import os
import traceback
import torch
import cv2
import json
import soundfile as sf
import io
from collections import Counter

# --- ADDED: Imports for Voice Activity Detection ---
import webrtcvad
import wave

# --- ADDITION: Imports for Comprehensive Proctoring ---
import face_recognition
import dlib
from object_detection import yoloV3Detect, classes as yolo_classes
from landmark_models import get_mouth_ratio, get_gaze_ratio
from headpose_estimation import load_hp_model, headpose_inference
from face_detection import get_face_detector, find_faces


# --- 1. INITIALIZE APP AND AI MODELS (Done once at startup) ---
app = Flask(__name__)
CORS(app) 

ENROLLMENT_DIR = Path("enrolled_data")
ENROLLMENT_DIR.mkdir(exist_ok=True)
STUDENT_DB_DIR = Path("student_db")
STUDENT_DB_DIR.mkdir(exist_ok=True)

print("Initializing AI models... (This may take a few minutes on first run)")
try:
    voice_encoder = VoiceEncoder()
    print("Voice encoder loaded successfully.")

    # Initialize the Voice Activity Detector.
    # Mode 3 is the most aggressive at filtering out non-speech.
    vad = webrtcvad.Vad(3)
    print("WebRTC VAD loaded successfully.")

except Exception as e:
    print(f"FATAL: Could not load core AI model. Error: {e}")
    vad = None

# --- Initialize Comprehensive Proctoring Models ---
print("Initializing comprehensive proctoring models...")
try:
    from object_detection import net as yolo_net
    hp_model = load_hp_model('models/Headpose_customARC_ZoomShiftNoise.hdf5')
    face_detector_model = get_face_detector()
    landmark_predictor = dlib.shape_predictor("models/shape_predictor_68_face_landmarks.dat")
    known_face_encodings_cache = {}
    print("Comprehensive proctoring models loaded successfully.")
    COMPREHENSIVE_MODELS_LOADED = True
except Exception as e:
    print(f"FATAL: Could not load comprehensive proctoring models. Error: {e}")
    COMPREHENSIVE_MODELS_LOADED = False


# --- 2. HELPER FUNCTION TO SAVE UPLOADED FILES ---
def save_temp_file(file_storage, suffix):
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        file_storage.save(tmp.name)
        return tmp.name

# --- 3. API ENDPOINTS ---

@app.route("/api/verify-face-multi-frame", methods=["POST"])
def verify_face_multi_frame_endpoint():
    try:
        if 'enrolled_embedding' not in request.form: return jsonify({"error": "Missing enrolled_embedding"}), 400
        if 'live_photos' not in request.files: return jsonify({"error": "No live photo frames were uploaded"}), 400
        enrolled_embedding_str = request.form['enrolled_embedding']
        enrolled_embedding = np.array(json.loads(enrolled_embedding_str))
        live_photo_files = request.files.getlist('live_photos')
        SIMILARITY_THRESHOLD = 0.87 
        best_similarity = 0.0
        for live_photo_file in live_photo_files:
            live_img_path = None
            try:
                live_img_path = save_temp_file(live_photo_file, ".jpg")
                live_embedding_objs = DeepFace.represent(img_path=live_img_path, model_name="VGG-Face", enforce_detection=True, detector_backend="mtcnn")
                if live_embedding_objs:
                    live_embedding = live_embedding_objs[0]["embedding"]
                    similarity = np.dot(enrolled_embedding, live_embedding) / (np.linalg.norm(enrolled_embedding) * np.linalg.norm(live_embedding))
                    if similarity > best_similarity: best_similarity = similarity
            except ValueError:
                print(f"Skipping a frame, no face detected.")
            finally:
                if live_img_path and os.path.exists(live_img_path): os.remove(live_img_path)
        is_verified = best_similarity >= SIMILARITY_THRESHOLD
        if is_verified: print(f"Verification success. Best similarity found was: {best_similarity}")
        else: print(f"Verification failed. Best similarity found was: {best_similarity}")
        return jsonify({"verified": bool(is_verified), "similarity": float(best_similarity), "threshold": SIMILARITY_THRESHOLD})
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": str(e), "verified": False}), 500

@app.route("/api/enroll-voice", methods=["POST"])
def enroll_voice_endpoint():
    try:
        if 'voice_sample' not in request.files: return jsonify({"error": "Missing voice_sample file"}), 400
        student_id = request.form.get('studentId')
        if not student_id: return jsonify({"error": "studentId is required"}), 400
        voice_file = request.files['voice_sample']
        audio_buffer = io.BytesIO(voice_file.read())
        wav, source_sr = sf.read(audio_buffer)
        processed_wav = preprocess_wav(wav, source_sr)
        embedding = voice_encoder.embed_utterance(processed_wav)
        embedding_path = ENROLLMENT_DIR / f"{student_id}_embedding.npy"
        np.save(str(embedding_path), embedding)
        print(f"Successfully enrolled voice for student: {student_id}")
        return jsonify({"message": "Voice enrolled successfully"}), 201
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@app.route("/api/analyze-audio", methods=["POST"])
def analyze_audio_endpoint():
    tmp_chunk_path = None
    try:
        student_id = request.form['studentId']
        audio_chunk_file = request.files['audio_chunk']
        enrolled_embedding_path = ENROLLMENT_DIR / f"{student_id}_embedding.npy"
        if not enrolled_embedding_path.exists():
            return jsonify({"error": "Student voice not enrolled"}), 404
        enrolled_embedding = np.load(str(enrolled_embedding_path))
        tmp_chunk_path = save_temp_file(audio_chunk_file, ".wav")
        
        # Voice similarity check (unchanged)
        live_wav = preprocess_wav(tmp_chunk_path)
        live_embedding = voice_encoder.embed_utterance(live_wav)
        similarity = np.dot(enrolled_embedding, live_embedding)
        is_match = similarity > 0.80

        # --- REPLACED pyannote with webrtcvad logic ---
        speaker_count = 1 # Default to 1 (no violation)
        if vad:
            try:
                with wave.open(tmp_chunk_path, 'rb') as wf:
                    sample_rate = wf.getframerate()
                    pcm_data = wf.readframes(wf.getnframes())
                
                # VAD requires 16-bit PCM audio. Frame duration can be 10, 20, or 30 ms.
                frame_duration_ms = 30 
                frame_size = int(sample_rate * (frame_duration_ms / 1000.0) * 2)
                
                num_speech_frames = 0
                total_frames = 0
                offset = 0
                
                while offset + frame_size <= len(pcm_data):
                    frame = pcm_data[offset:offset + frame_size]
                    if vad.is_speech(frame, sample_rate):
                        num_speech_frames += 1
                    total_frames += 1
                    offset += frame_size
                
                # If more than 10% of the frames contain speech, flag it as a violation.
                speech_ratio = num_speech_frames / total_frames if total_frames > 0 else 0
                if speech_ratio > 0.1:
                    print(f"Voice activity detected. Speech ratio: {speech_ratio:.2f}")
                    speaker_count = 2 # Use 2 to indicate a violation, same as multiple speakers
            except Exception as vad_error:
                print(f"Could not process audio with VAD. Error: {vad_error}")
        
        os.remove(tmp_chunk_path)
        return jsonify({ "voice_match": bool(is_match), "speaker_count": speaker_count, "similarity": float(similarity) })
    
    except Exception as e:
        if tmp_chunk_path and os.path.exists(tmp_chunk_path): os.remove(tmp_chunk_path)
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@app.route("/api/generate-embedding", methods=["POST"])
def generate_embedding_endpoint():
    """
    Receives a single photo, generates a face embedding, and returns it.
    This is used for the initial user enrollment.
    """
    temp_path = None
    try:
        if 'enrollment_photo' not in request.files:
            return jsonify({"error": "Missing 'enrollment_photo' file"}), 400

        photo_file = request.files['enrollment_photo']
        temp_path = save_temp_file(photo_file, ".jpg")

        # Use DeepFace to generate the embedding. This will error if no face is found.
        embedding_objs = DeepFace.represent(
            img_path=temp_path, 
            model_name="VGG-Face", 
            enforce_detection=True, 
            detector_backend="mtcnn"
        )
        
        # DeepFace.represent returns a list of dicts, we need the first one's embedding
        if not embedding_objs:
             return jsonify({"error": "Could not generate embedding, face not detected."}), 400

        embedding = embedding_objs[0]["embedding"]
        
        return jsonify({"embedding": embedding})

    except ValueError as ve:
        # This specific exception is often raised by DeepFace for no face
        print(f"Face detection failed during enrollment: {ve}")
        return jsonify({"error": "No face was detected in the uploaded photo. Please try again."}), 400
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": f"An internal error occurred: {str(e)}"}), 500
    finally:
        # Clean up the temporary file
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

@app.route("/api/proctor-frame", methods=["POST"])
def proctor_frame_endpoint():
    if not COMPREHENSIVE_MODELS_LOADED:
        return jsonify({"error": "Proctoring models are not available on the server."}), 503

    live_img_path = None
    try:
        if 'frame' not in request.files: return jsonify({"error": "Missing frame image"}), 400
        if 'studentId' not in request.form: return jsonify({"error": "Missing studentId"}), 400
        
        student_id = request.form['studentId']
        frame_file = request.files['frame']
        
        frame = cv2.imdecode(np.frombuffer(frame_file.read(), np.uint8), cv2.IMREAD_COLOR)
        frame_file.seek(0)
        live_img_path = save_temp_file(frame_file, ".jpg")

        results = {
            "person_count": 0, 
            "banned_objects": [], 
            "face_detected": False, 
            "face_verified": None, # Default to None
            "mouth_open": None, 
            "head_pose": None, 
            "eye_gaze": None
        }
        small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
        
        # --- Object detection (runs every time) ---
        try:
            fboxes, fclasses = yoloV3Detect(small_frame)
            count_items = Counter(fclasses)
            results["person_count"] = count_items.get('person', 0)
            results["banned_objects"] = [item for item in count_items if item in ['laptop', 'cell phone', 'book', 'tv']]
        except Exception as obj_e:
            print(f"CRITICAL WARNING: Object detection crashed with error: {obj_e}")

        # --- Face-related checks ---
        if results["person_count"] >= 1:
            faces = find_faces(small_frame, face_detector_model)
            if len(faces) > 0:
                results["face_detected"] = True
                face_box = faces[0]

                # *** START OF THE FIX ***

                # Check if the frontend specifically requested a face verification check
                should_verify_face = request.form.get('perform_face_verification') == 'true'

                if should_verify_face:
                    print(f"[{student_id}] Performing scheduled face verification...")
                    # The rest of the verification logic is now inside this conditional block
                    if 'enrolled_embedding' in request.form:
                        SIMILARITY_THRESHOLD = 0.87
                        try:
                            enrolled_embedding_str = request.form['enrolled_embedding']
                            enrolled_embedding = np.array(json.loads(enrolled_embedding_str))

                            live_embedding_objs = DeepFace.represent(
                                img_path=live_img_path, 
                                model_name="VGG-Face", 
                                enforce_detection=False,
                                detector_backend="mtcnn"
                            )
                            
                            if live_embedding_objs:
                                live_embedding = live_embedding_objs[0]["embedding"]
                                similarity = np.dot(enrolled_embedding, live_embedding) / (np.linalg.norm(enrolled_embedding) * np.linalg.norm(live_embedding))
                                results["face_verified"] = bool(similarity >= SIMILARITY_THRESHOLD)
                                print(f"[{student_id}] Verification Check: Similarity={similarity:.2f}, Verified={results['face_verified']}")
                            else:
                                results["face_verified"] = False

                        except Exception as verification_error:
                            results["face_verified"] = False
                            print(f"[{student_id}] An error occurred during DeepFace verification: {verification_error}")
                    else:
                        results["face_verified"] = "enrollment_data_not_received"
                else:
                    # If not a scheduled check, we don't return a verification result
                    print(f"[{student_id}] Skipping face verification for this frame (not scheduled).")
                    results["face_verified"] = None

                # *** END OF THE FIX ***

                # The other lightweight checks (gaze, headpose, etc.) continue to run every time
                (left, top, right, bottom) = [c * 4 for c in face_box]
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                facial_landmarks = landmark_predictor(gray, dlib.rectangle(left, top, right, bottom))
                
                results["mouth_open"] = bool(get_mouth_ratio([60, 62, 64, 66], frame, facial_landmarks) > 0.1)
                
                hp_angles, _ = headpose_inference(hp_model, frame, face_box)
                head_away = (abs(hp_angles[0]) > 20 or abs(hp_angles[1]) > 20) # Example threshold
                results["head_pose"] = "away" if head_away else "center"
                
                gaze_ratio_lr_left, _ = get_gaze_ratio([36, 37, 38, 39, 40, 41], frame, facial_landmarks)
                gaze_ratio_lr_right, _ = get_gaze_ratio([42, 43, 44, 45, 46, 47], frame, facial_landmarks)
                gaze_ratio_lr = (gaze_ratio_lr_left + gaze_ratio_lr_right) / 2.0
                gaze_away = gaze_ratio_lr <= 0.35 or gaze_ratio_lr >= 4 # Example threshold
                results["eye_gaze"] = "away" if gaze_away else "center"
                
        return jsonify(results)
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"An unexpected error occurred during proctoring analysis: {str(e)}"}), 500
    finally:
        if live_img_path and os.path.exists(live_img_path):
            os.remove(live_img_path)
            
# --- 4. START THE SERVER ---
if __name__ == "__main__":
    print("Starting Flask server on http://localhost:5001")
    app.run(port=5001, debug=False, use_reloader=False)