const axios = require('axios');
const FormData = require('form-data');
const { Student } = require('../users/users.model');
const { uploadFromBuffer } = require('../../utils/cloudinary');

const fs = require('fs/promises');
const path = require('path');

const PYTHON_API_URL = 'http://localhost:5001/api';

async function forwardToPython(endpoint, formData) {
    try {
        const headers = { ...formData.getHeaders() };
        console.log(`[AI Service] Forwarding to Python endpoint: ${PYTHON_API_URL}${endpoint}`);
        const response = await axios.post(`${PYTHON_API_URL}${endpoint}`, formData, { headers });
        console.log(`[AI Service] Success from ${endpoint}. Status: ${response.status}`);
        return response.data;
    } catch (error) {
        console.error(`[AI Service] CRITICAL ERROR forwarding to ${endpoint}:`);
        if (error.response) {
            console.error('Data:', error.response.data);
            console.error('Status:', error.response.status);
            console.error('Headers:', error.response.headers);
        } else if (error.request) {
            console.error('Request Error: No response received. Is the Python service running?');
        } else {
            console.error('Axios Setup Error:', error.message);
        }
        throw new Error(`AI Service failed for ${endpoint}. Check Node.js logs for details.`);
    }
}


/**
 * Verifies a user by sending multiple live frames against a stored embedding.
 */
const verifyFace = async (studentId, livePhotoFiles) => {
    // --- ADDED FAILSAFE LOGGING ---
    console.log(`[SERVICE] verifyFace received studentId: ${studentId}`);
    console.log('[SERVICE] Checking livePhotoFiles argument...');
    
    // This check will prevent the '.forEach' crash and give a clearer error.
    if (!livePhotoFiles || !Array.isArray(livePhotoFiles) || livePhotoFiles.length === 0) {
        console.error('[SERVICE] CRITICAL: livePhotoFiles is not a valid array!', livePhotoFiles);
        throw new Error("Proctoring service received an invalid or empty list of photos.");
    }
    console.log(`[SERVICE] livePhotoFiles is a valid array with ${livePhotoFiles.length} items. Proceeding.`);

    const student = await Student.findOne({ student_id: studentId }).select('face_embedding').lean();
    if (!student || !student.face_embedding || student.face_embedding.length === 0) {
        throw new Error("Face enrollment data not found for this student.");
    }
    const enrolledEmbedding = student.face_embedding;

    const formData = new FormData();
    formData.append('enrolled_embedding', JSON.stringify(enrolledEmbedding));
    
    // The forEach loop that was previously crashing
    livePhotoFiles.forEach((file, index) => {
        formData.append('live_photos', file.buffer, `snapshot_${index}.jpg`);
    });
    
    return forwardToPython('/verify-face-multi-frame', formData);
};

const enrollVoice = async (studentId, voiceFile) => {
    console.log(`[Proctoring Service] Starting voice enrollment for student: ${studentId}`);
    const formData = new FormData();
    formData.append('studentId', studentId);
    formData.append('voice_sample', voiceFile.buffer, 'enrollment.wav');
    return forwardToPython('/enroll-voice', formData);
};

const analyzeAudio = async (studentId, audioChunkFile) => {
    console.log(`[Proctoring Service] Starting audio analysis for student: ${studentId}`);
    const formData = new FormData();
    formData.append('studentId', studentId);
    formData.append('audio_chunk', audioChunkFile.buffer, 'chunk.wav');
    return forwardToPython('/analyze-audio', formData);
};

const performFullCheck = async (studentId, livePhotoFiles, audioChunkFile) => {
    console.log(`[Proctoring Service] Full check for student: ${studentId}. Frames: ${livePhotoFiles.length}, Audio: ${!!audioChunkFile}`);
    const student = await Student.findOne({ student_id: studentId }).select('face_embedding').lean();
    if (!student || !student.face_embedding || student.face_embedding.length === 0) {
        throw new Error("Enrollment data not found for this student.");
    }
    const faceCheckPromise = (async () => {
        const faceFormData = new FormData();
        faceFormData.append('enrolled_embedding', JSON.stringify(student.face_embedding));
        livePhotoFiles.forEach((file, index) => {
            faceFormData.append('live_photos', file.buffer, `snapshot_${index}.jpg`);
        });
        return forwardToPython('/verify-face-multi-frame', faceFormData);
    })();
    if (audioChunkFile) {
        const audioCheckPromise = (async () => {
            const audioFormData = new FormData();
            audioFormData.append('studentId', studentId);
            audioFormData.append('audio_chunk', audioChunkFile.buffer, 'chunk.wav');
            return forwardToPython('/analyze-audio', audioFormData);
        })();
        const [faceResult, audioResult] = await Promise.allSettled([faceCheckPromise, audioCheckPromise]);
        const finalResult = {
            face_verified: faceResult.status === 'fulfilled' ? faceResult.value.verified : null,
            voice_match: audioResult.status === 'fulfilled' ? audioResult.value.voice_match : null,
            speaker_count: audioResult.status === 'fulfilled' ? audioResult.value.speaker_count : null,
        };
        if (faceResult.status === 'rejected') console.error('[Proctoring Service] Face check promise rejected:', faceResult.reason);
        if (audioResult.status === 'rejected') console.error('[Proctoring Service] Audio check promise rejected:', audioResult.reason);
        return finalResult;
    } else {
        const faceResult = await faceCheckPromise;
        return {
            face_verified: faceResult.verified,
            voice_match: null,
            speaker_count: null,
        };
    }
};


const performComprehensiveCheck = async (studentId, frameFile, performVerificationFlag) => { // 1. Add new argument
    console.log(`[Proctoring Service] Starting comprehensive check for student: ${studentId}. Verification requested: ${!!performVerificationFlag}`);
    
    const student = await Student.findOne({ student_id: studentId }).select('face_embedding').lean();

    const formData = new FormData();
    formData.append('studentId', studentId);
    formData.append('frame', frameFile.buffer, 'proctor_frame.jpg');

    // 2. Conditionally append the verification flag if it's true
    if (performVerificationFlag) {
        formData.append('perform_face_verification', 'true');
    }

    // 3. Only send the embedding if verification is requested, to save bandwidth
    // and align with the Python logic.
    if (performVerificationFlag) {
        if (!student || !student.face_embedding || student.face_embedding.length === 0) {
            console.warn(`[Proctoring Service] No face embedding for ${studentId}. Face verification will fail.`);
            // No need to send embedding if it doesn't exist
        } else {
            formData.append('enrolled_embedding', JSON.stringify(student.face_embedding));
        }
    }
    
    return forwardToPython('/proctor-frame', formData);
};

const enrollFace = async (studentId, photoFile, role = 'student') => {
    console.log(`[SERVICE] Starting face enrollment for student: ${studentId} | Role: ${role}`);

    if (!photoFile) {
        throw new Error("No photo file was provided for enrollment.");
    }

    // Step 0: Check existing record
    const existingStudent = await Student.findOne({ student_id: studentId }).select('photo_url').lean();

    // Block re-enrollment if photo exists, unless admin
    if (existingStudent?.photo_url && role !== 'admin') {
        throw new Error("Enrollment already exists. Please contact support to update your photo.");
    }

    // Step 1: Upload to Cloudinary
    const cloudinaryResult = await uploadFromBuffer(photoFile.buffer, 'student-enrollment-photos');
    const photoUrl = cloudinaryResult.secure_url;
    if (!photoUrl) throw new Error("Failed to upload photo to Cloudinary.");

    // Step 2: Save locally
    const studentDbDir = path.resolve(__dirname, '../../../student_db');
    await fs.mkdir(studentDbDir, { recursive: true });
    const localImagePath = path.join(studentDbDir, `${studentId}.jpg`);
    await fs.writeFile(localImagePath, photoFile.buffer);

    // Step 3: Get embedding
    const formData = new FormData();
    formData.append('enrollment_photo', photoFile.buffer, 'enrollment.jpg');
    const pythonResponse = await forwardToPython('/generate-embedding', formData);
    const { embedding } = pythonResponse;

    if (!embedding || embedding.length === 0) {
        throw new Error("Failed to get a valid face embedding from the AI service.");
    }

    // Step 4: Save to DB
    const updatedStudent = await Student.findOneAndUpdate(
        { student_id: studentId },
        {
            photo_url: photoUrl,
            face_embedding: embedding
        },
        { new: true }
    );

    if (!updatedStudent) {
        throw new Error("Could not find student to update enrollment data.");
    }

    return {
        message: "Face enrolled successfully.",
        photoUrl: updatedStudent.photo_url
    };
};


module.exports = {
    enrollFace,
    verifyFace,
    enrollVoice,
    analyzeAudio,
    performFullCheck,
    performComprehensiveCheck
};