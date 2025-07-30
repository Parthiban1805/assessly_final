import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import RecordRTC from 'recordrtc';
import { usePermissions } from '../../hooks/usePermissions';
import useProctoringStore from '../../stores/proctoringStore';

// --- CONSTANTS ---
const API_BASE_URL = 'http://localhost:5000/api/v1';

// --- UI SUB-COMPONENTS (for a clean structure) ---

const CameraIcon = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg>;
const MicIcon = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>;
const LockIcon = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>;
const CheckIcon = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;

const LoadingSpinner = () => <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>;
const ButtonSpinner = () => <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>;

const LoadingView = ({ message }) => (
    <div className="flex flex-col items-center justify-center space-y-4 p-8 text-center">
        <h3 className="text-xl font-semibold text-gray-700">{message}</h3>
        <LoadingSpinner />
    </div>
);

const PermissionStep = ({ onRequest }) => (
    <div className="flex flex-col items-center space-y-6 p-8 text-center">
        <div className="flex items-center space-x-4 text-blue-500">
            <CameraIcon className="w-10 h-10" />
            <MicIcon className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Permissions Required</h2>
        <p className="text-gray-600 max-w-md">This proctored assessment requires camera and microphone access to ensure exam integrity.</p>
        <button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" onClick={onRequest}>
            Grant Access
        </button>
    </div>
);

const BlockedPermissionStep = () => (
    <div className="flex flex-col items-center space-y-6 p-8 text-center">
        <div className="flex items-center space-x-3 text-red-600">
            <LockIcon className="w-8 h-8" />
            <h2 className="text-2xl font-bold">Permissions Blocked</h2>
        </div>
        <p className="text-red-700 bg-red-100 border border-red-200 rounded-lg px-4 py-3 max-w-md">You have permanently blocked permissions. You must manually enable them in browser settings.</p>
        <div className="bg-gray-50 text-left rounded-lg p-4 w-full max-w-lg">
            <h4 className="font-semibold text-gray-800 mb-2">How to Fix:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                <li>Find the lock icon (🔒) in your browser's address bar.</li>
                <li>Click it and go to "Site settings".</li>
                <li>Change Camera and Microphone to "Allow".</li>
                <li><strong>Refresh this page</strong> after changing settings.</li>
            </ol>
        </div>
        <button className="w-full sm:w-auto bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-700" onClick={() => window.location.reload()}>Refresh Page</button>
    </div>
);

const FaceVerificationStep = ({ videoRef, onVerify, isProcessing, error }) => (
    <div className="flex flex-col items-center space-y-4 p-8">
        <h2 className="text-2xl font-bold text-gray-800">Face Verification</h2>
        <p className="text-gray-600 text-center max-w-md">Position your face in the center of the frame and click verify.</p>
        <div className="w-full max-w-md aspect-video bg-black rounded-lg overflow-hidden border-4 border-gray-200 shadow-lg">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform -scale-x-100" />
        </div>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        <button onClick={onVerify} disabled={isProcessing} className="w-48 mt-4 flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
            {isProcessing ? <><ButtonSpinner /> Verifying...</> : 'Verify My Face'}
        </button>
    </div>
);

const VoiceEnrollmentStep = ({ onRecord, isRecording, isProcessing, error }) => (
    <div className="flex flex-col items-center space-y-6 p-8">
        <h2 className="text-2xl font-bold text-gray-800">Voice Enrollment</h2>
        <p className="text-gray-600 text-center max-w-md">Click record and clearly say the phrase below into your microphone.</p>
        <p className="bg-gray-100 text-gray-800 font-mono p-4 rounded-lg text-lg">"My voice is my passport, verify me."</p>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button onClick={onRecord} disabled={isProcessing} className={`w-56 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-white transition-colors ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} disabled:bg-gray-400`}>
            {isProcessing ? <><ButtonSpinner /> Processing...</> : isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
    </div>
);

const SuccessStep = ({ onProceed }) => (
    <div className="flex flex-col items-center space-y-4 p-8 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckIcon className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Verification Complete</h2>
        <p className="text-gray-600 max-w-md">You are ready to begin the assessment.</p>
        <button onClick={onProceed} className="w-full sm:w-auto bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors">
            Start Assessment
        </button>
    </div>
);

// --- MAIN COMPONENT ---
const VerificationPage = () => {
    const { assessmentId } = useParams();
    const navigate = useNavigate();

    const { status: permissionStatus } = usePermissions();
    
    const [step, setStep] = useState('loading');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState(null);

    const videoRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const recorderRef = useRef(null);
    const { setMediaStream, clearMediaStream } = useProctoringStore();

    const startCameraAndMic = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 1280, height: 720 }, 
                audio: true 
            });
            
            // Store the stream in both the local ref and the global store
            mediaStreamRef.current = stream;
            setMediaStream(stream); 
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setStep('face_cam');
        } catch (err) {
            setError("Camera and microphone access is required for verification.");
            setStep('permission_blocked');
        }
    }, [setMediaStream]);

    useEffect(() => {
        if (step === 'face_cam' && videoRef.current && mediaStreamRef.current) {
            videoRef.current.srcObject = mediaStreamRef.current;
        }
    }, [step]);

    const handleFaceMatch = useCallback(async () => {
        setIsProcessing(true);
        setError(null);

        if (!videoRef.current) {
            setError("Camera not available.");
            setIsProcessing(false);
            return;
        }

        // --- Multi-Frame Capture Logic ---
        const frames = [];
        const canvas = document.createElement('canvas');
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        const NUM_FRAMES = 15;
        const FRAME_INTERVAL = 100; // Capture a frame every 100ms

        for (let i = 0; i < NUM_FRAMES; i++) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
            frames.push(imageBlob);
            // Wait for the next interval
            await new Promise(resolve => setTimeout(resolve, FRAME_INTERVAL));
        }
        
        // --- Prepare FormData with multiple files ---
        const formData = new FormData();
        frames.forEach((frame, index) => {
            formData.append('livePhotos', frame, `frame_${index}.jpg`);
        });
        
        try {
            const token = sessionStorage.getItem("token");
            const response = await axios.post(`${API_BASE_URL}/proctoring/verify-face`, formData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data.verified) {
                setStep('voice_enroll');
            } else {
                const similarityPercent = (response.data.similarity * 100).toFixed(0);
                setError(`Face match failed. Best similarity was ${similarityPercent}%. Please look directly at the camera and try again.`);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Verification process failed.');
        } finally {
            setIsProcessing(false);
        }
    }, []);

    const handleVoiceRecord = useCallback(() => {
        setError(null);
        
        if (isRecording) {
            // Stop recording
            if (recorderRef.current) {
                setIsProcessing(true);
                recorderRef.current.stopRecording(() => {
                    const blob = recorderRef.current.getBlob();
                    uploadVoiceSample(blob);
                });
            } else {
                setError("Recording failed. Please try again.");
                setIsRecording(false);
            }
        } else {
            // Start recording
            if (mediaStreamRef.current) {
                try {
                    recorderRef.current = new RecordRTC(mediaStreamRef.current, {
                        type: 'audio',
                        mimeType: 'audio/wav',
                        recorderType: RecordRTC.StereoAudioRecorder,
                        numberOfAudioChannels: 1,
                        sampleRate: 44100,
                    });
                    
                    recorderRef.current.startRecording();
                    setIsRecording(true);
                } catch (err) {
                    setError("Failed to start recording. Please check your microphone.");
                    console.error('Recording start error:', err);
                }
            } else {
                setError("Microphone not available. Please refresh the page.");
            }
        }
    }, [isRecording]);
const uploadVoiceSample = async (voiceBlob) => {
    const formData = new FormData();
    formData.append('voiceSample', voiceBlob, 'enrollment.wav');
    
    try {
        const token = sessionStorage.getItem("token");
        await axios.post(`${API_BASE_URL}/proctoring/enroll-voice`, formData, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        setStep('success');
    } catch (err) {
        setError(err.response?.data?.message || 'Failed to enroll voice.');
    } finally {
        setIsProcessing(false);
        setIsRecording(false);
        // Clean up the recorder reference WITHOUT destroying the stream
        if (recorderRef.current) {
            // DO NOT CALL .destroy() as it stops the stream tracks.
            // recorderRef.current.destroy(); 
            
            // Simply clear the reference to the recorder instance.
            recorderRef.current = null;
        }
    }
};
// Add this useEffect for robust cleanup
useEffect(() => {
    // This function will be called when the component unmounts
    return () => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
        }
        // No need to call clearMediaStream() here, as the new page will handle it
    };
}, []); // Empty dependency array means this runs only on mount and unmount

const handleProceedToAssessment = useCallback(() => {
    // --- STOP THE STREAM ---
    if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    clearMediaStream(); // Clear the stream from the global store

    // --- NAVIGATE ---
    navigate(`/assessment/${assessmentId}/questions`);
}, [assessmentId, navigate, clearMediaStream]);
    useEffect(() => {
        if (permissionStatus === 'granted') {
            startCameraAndMic();
        } else if (permissionStatus === 'prompt') {
            setStep('permission_prompt');
        } else if (permissionStatus === 'denied') {
            setStep('permission_blocked');
        }
    }, [permissionStatus, startCameraAndMic]);

    

    const renderContent = () => {
        if (step === 'loading') {
            return <LoadingView message="Checking Permissions..." />;
        }
        switch (step) {
            case 'permission_prompt':
                return <PermissionStep onRequest={startCameraAndMic} />;
            case 'permission_blocked':
                return <BlockedPermissionStep />;
            case 'face_cam':
                return <FaceVerificationStep videoRef={videoRef} onVerify={handleFaceMatch} isProcessing={isProcessing} error={error} />;
            case 'voice_enroll':
                return <VoiceEnrollmentStep onRecord={handleVoiceRecord} isRecording={isRecording} isProcessing={isProcessing} error={error} />;
            case 'success':
                return <SuccessStep onProceed={handleProceedToAssessment} />;
            default:
                return <LoadingView message="Initializing..." />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4">
                    <h1 className="text-white text-2xl font-bold text-center">Identity Verification</h1>
                    <p className="text-blue-200 text-center mt-1 text-sm">Secure Assessment Portal</p>
                </div>
                <div className="p-2 sm:p-4">{renderContent()}</div>
            </div>
        </div>
    );
};

export default VerificationPage;
