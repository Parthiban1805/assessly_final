import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import RecordRTC from 'recordrtc'; // Library for recording media streams
import { usePermissions } from '../../hooks/usePermissions'; // Custom hook for camera/mic permissions
import useProctoringStore from '../../stores/proctoringStore'; // Zustand store for media stream management
import { API_BASE_URL } from '../../config/constants'; // Import the common API base URL

// --- UI Sub-Components for reusability and clarity ---

// Icons (assuming these are SVG or simple components that inherit color via `currentColor` or specific classes)
const CameraIcon = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg>;
const MicIcon = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>;
const LockIcon = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>;
const CheckIcon = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;

const LoadingSpinner = () => <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>;
const ButtonSpinner = () => <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>;

/**
 * LoadingView component displays a loading message and spinner.
 * @param {object} props - Component props.
 * @param {string} props.message - The message to display.
 * @returns {JSX.Element} Loading UI.
 */
const LoadingView = ({ message }) => (
    <div className="flex flex-col items-center justify-center space-y-4 p-8 text-center">
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200">{message}</h3>
        <LoadingSpinner />
    </div>
);

/**
 * PermissionStep component prompts the user to grant camera and microphone access.
 * @param {object} props - Component props.
 * @param {function} props.onRequest - Callback to request permissions.
 * @returns {JSX.Element} Permission request UI.
 */
const PermissionStep = ({ onRequest }) => (
    <div className="flex flex-col items-center space-y-6 p-8 text-center">
        <div className="flex items-center space-x-4 text-blue-500 dark:text-blue-400">
            <CameraIcon className="w-10 h-10" />
            <MicIcon className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Permissions Required</h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-md">This proctored assessment requires camera and microphone access to ensure exam integrity.</p>
        <button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" onClick={onRequest}>
            Grant Access
        </button>
    </div>
);

/**
 * BlockedPermissionStep component informs the user that permissions are blocked and how to unblock them.
 * @returns {JSX.Element} Blocked permission UI.
 */
const BlockedPermissionStep = () => (
    <div className="flex flex-col items-center space-y-6 p-8 text-center">
        <div className="flex items-center space-x-3 text-red-600 dark:text-red-400">
            <LockIcon className="w-8 h-8" />
            <h2 className="text-2xl font-bold">Permissions Blocked</h2>
        </div>
        <p className="text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg px-4 py-3 max-w-md">You have permanently blocked permissions. You must manually enable them in browser settings.</p>
        <div className="bg-gray-50 dark:bg-gray-700 text-left rounded-lg p-4 w-full max-w-lg">
            <h4 className="font-semibold text-gray-800 dark:text-white mb-2">How to Fix:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <li>Find the lock icon (🔒) in your browser's address bar.</li>
                <li>Click it and go to "Site settings".</li>
                <li>Change Camera and Microphone to "Allow".</li>
                <li><strong>Refresh this page</strong> after changing settings.</li>
            </ol>
        </div>
        <button className="w-full sm:w-auto bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-700 dark:hover:bg-gray-500" onClick={() => window.location.reload()}>Refresh Page</button>
    </div>
);

/**
 * FaceVerificationStep component guides the user through facial verification.
 * @param {object} props - Component props.
 * @param {React.RefObject<HTMLVideoElement>} props.videoRef - Ref to the video element.
 * @param {function} props.onVerify - Callback to trigger verification.
 * @param {boolean} props.isProcessing - Indicates if verification is in progress.
 * @param {string|null} props.error - Error message to display.
 * @returns {JSX.Element} Face verification UI.
 */
const FaceVerificationStep = ({ videoRef, onVerify, isProcessing, error }) => (
    <div className="flex flex-col items-center space-y-4 p-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Face Verification</h2>
        <p className="text-gray-600 dark:text-gray-300 text-center max-w-md">Position your face in the center of the frame and click verify.</p>
        <div className="w-full max-w-md aspect-video bg-black rounded-lg overflow-hidden border-4 border-gray-200 dark:border-gray-700 shadow-lg">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform -scale-x-100" />
        </div>
        {error && <p className="text-red-600 dark:text-red-400 text-sm mt-2">{error}</p>}
        <button onClick={onVerify} disabled={isProcessing} className="w-48 mt-4 flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 dark:hover:bg-green-500 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors">
            {isProcessing ? <><ButtonSpinner /> Verifying...</> : 'Verify My Face'}
        </button>
    </div>
);

/**
 * VoiceEnrollmentStep component guides the user through voice enrollment.
 * @param {object} props - Component props.
 * @param {function} props.onRecord - Callback to start/stop recording.
 * @param {boolean} props.isRecording - Indicates if recording is active.
 * @param {boolean} props.isProcessing - Indicates if processing is in progress.
 * @param {string|null} props.error - Error message to display.
 * @returns {JSX.Element} Voice enrollment UI.
 */
const VoiceEnrollmentStep = ({ onRecord, isRecording, isProcessing, error }) => (
    <div className="flex flex-col items-center space-y-6 p-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Voice Enrollment</h2>
        <p className="text-gray-600 dark:text-gray-300 text-center max-w-md">Click record and clearly say the phrase below into your microphone.</p>
        <p className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-mono p-4 rounded-lg text-lg">"My voice is my passport, verify me."</p>
        {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
        <button onClick={onRecord} disabled={isProcessing} className={`w-56 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-white transition-colors ${isRecording ? 'bg-red-600 hover:bg-red-700 dark:hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500'} disabled:bg-gray-400 dark:disabled:bg-gray-600`}>
            {isProcessing ? <><ButtonSpinner /> Processing...</> : isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
    </div>
);

/**
 * SuccessStep component confirms successful verification and prompts to proceed.
 * @param {object} props - Component props.
 * @param {function} props.onProceed - Callback to proceed to assessment.
 * @returns {JSX.Element} Success UI.
 */
const SuccessStep = ({ onProceed }) => (
    <div className="flex flex-col items-center space-y-4 p-8 text-center">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
            <CheckIcon className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Verification Complete</h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-md">You are ready to begin the assessment.</p>
        <button onClick={onProceed} className="w-full sm:w-auto bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 dark:hover:bg-green-500 transition-colors">
            Start Assessment
        </button>
    </div>
);

/**
 * VerificationPage component orchestrates the identity verification process for students
 * before they can begin a proctored assessment. This includes camera/mic permission,
 * facial verification, and voice enrollment.
 *
 * @returns {JSX.Element} The verification process UI.
 */
const VerificationPage = () => {
    const { assessmentId } = useParams(); // Get assessment ID from URL parameters.
    const navigate = useNavigate(); // Hook for programmatic navigation.

    const { status: permissionStatus } = usePermissions(); // Get camera/mic permission status.

    // State to manage the current step of the verification process.
    const [step, setStep] = useState('loading'); // e.g., 'loading', 'permission_prompt', 'face_cam', 'voice_enroll', 'success'.
    // State to indicate if an API request (e.g., verification, enrollment) is in progress.
    const [isProcessing, setIsProcessing] = useState(false);
    // State to indicate if audio recording is active.
    const [isRecording, setIsRecording] = useState(false);
    // State to store any error messages during the verification process.
    const [error, setError] = useState(null);

    // Refs for media elements and recording.
    const videoRef = useRef(null); // Reference to the video element for camera stream.
    const mediaStreamRef = useRef(null); // Reference to the active media stream (camera + mic).
    const recorderRef = useRef(null); // Reference to the RecordRTC instance for audio recording.

    const { setMediaStream, clearMediaStream } = useProctoringStore(); // Zustand store for global media stream management.

    /**
     * Starts camera and microphone streams. Sets the stream to the video element and global store.
     * Transitions the step to 'face_cam' upon successful stream acquisition.
     * Uses useCallback for memoization.
     */
    const startCameraAndMic = useCallback(async () => {
        try {
            // Request access to both video and audio streams.
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 }, // High resolution for video capture.
                audio: true
            });

            mediaStreamRef.current = stream; // Store the stream locally.
            setMediaStream(stream); // Store the stream in the global Zustand store.

            if (videoRef.current) {
                videoRef.current.srcObject = stream; // Attach stream to video element.
            }
            setStep('face_cam'); // Transition to the face verification step.
        } catch (err) {
            console.error("Failed to start camera and mic:", err);
            setError("Camera and microphone access is required for verification.");
            setStep('permission_blocked'); // Transition to permission blocked state on error.
        }
    }, [setMediaStream]); // Dependency: setMediaStream from Zustand.

    /**
     * Effect hook to ensure the video stream is correctly attached to the video element
     * whenever the `step` changes to 'face_cam'.
     */
    useEffect(() => {
        if (step === 'face_cam' && videoRef.current && mediaStreamRef.current) {
            videoRef.current.srcObject = mediaStreamRef.current;
        }
    }, [step]); // Dependency: step state.

    /**
     * Handles the face verification process. Captures multiple frames from the video stream,
     * sends them to the backend for verification against the enrolled face.
     * Transitions to voice enrollment on success, or displays an error.
     * Uses useCallback for memoization.
     */
    const handleFaceMatch = useCallback(async () => {
        setIsProcessing(true); // Indicate processing is active.
        setError(null); // Clear previous errors.

        if (!videoRef.current) {
            setError("Camera not available.");
            setIsProcessing(false);
            return;
        }

        const frames = [];
        const canvas = document.createElement('canvas'); // Create a temporary canvas for capturing frames.
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');

        const NUM_FRAMES = 15; // Number of frames to capture for robust verification.
        const FRAME_INTERVAL = 100; // Interval between frame captures in milliseconds.

        // Capture multiple frames.
        for (let i = 0; i < NUM_FRAMES; i++) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height); // Draw current video frame.
            const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg')); // Convert canvas to JPEG Blob.
            frames.push(imageBlob);
            await new Promise(resolve => setTimeout(resolve, FRAME_INTERVAL)); // Wait before capturing next frame.
        }

        // Prepare FormData with multiple image files.
        const formData = new FormData();
        frames.forEach((frame, index) => {
            formData.append('livePhotos', frame, `frame_${index}.jpg`);
        });

        try {
            const token = sessionStorage.getItem("token");
            // Send captured frames for face verification.
            const response = await axios.post(`${API_BASE_URL}/proctoring/verify-face`, formData, {
                headers: { 'Authorization': `Bearer ${token}` } // Include authorization token.
            });

            if (response.data.verified) {
                setStep('voice_enroll'); // Transition to voice enrollment on successful verification.
            } else {
                const similarityPercent = (response.data.similarity * 100).toFixed(0);
                setError(`Face match failed. Best similarity was ${similarityPercent}%. Please look directly at the camera and try again.`);
            }
        } catch (err) {
            console.error("Face verification failed:", err);
            setError(err.response?.data?.message || 'Verification process failed.');
        } finally {
            setIsProcessing(false); // End processing state.
        }
    }, []); // Empty dependency array as values like NUM_FRAMES/FRAME_INTERVAL are constants and not from state/props.

    /**
     * Handles starting and stopping the voice recording for enrollment.
     * On stopping, it uploads the recorded audio to the backend.
     * Uses useCallback for memoization.
     */
    const handleVoiceRecord = useCallback(() => {
        setError(null); // Clear previous errors.

        if (isRecording) {
            // Stop recording logic.
            if (recorderRef.current) {
                setIsProcessing(true); // Indicate processing active.
                recorderRef.current.stopRecording(() => {
                    const blob = recorderRef.current.getBlob(); // Get recorded audio blob.
                    uploadVoiceSample(blob); // Upload the audio.
                });
            } else {
                setError("Recording failed. Please try again.");
                setIsRecording(false);
            }
        } else {
            // Start recording logic.
            if (mediaStreamRef.current) {
                try {
                    // Initialize RecordRTC with the media stream for audio recording.
                    recorderRef.current = new RecordRTC(mediaStreamRef.current, {
                        type: 'audio',
                        mimeType: 'audio/wav', // Specify audio format.
                        recorderType: RecordRTC.StereoAudioRecorder,
                        numberOfAudioChannels: 1,
                        sampleRate: 44100,
                    });

                    recorderRef.current.startRecording(); // Start recording.
                    setIsRecording(true); // Set recording state.
                } catch (err) {
                    setError("Failed to start recording. Please check your microphone.");
                    console.error('Recording start error:', err);
                }
            } else {
                setError("Microphone not available. Please refresh the page.");
            }
        }
    }, [isRecording]); // Dependency: isRecording state.

    /**
     * Uploads the recorded voice sample (Blob) to the backend for voice enrollment.
     * @param {Blob} voiceBlob - The recorded audio Blob.
     */
    const uploadVoiceSample = async (voiceBlob) => {
        const formData = new FormData();
        formData.append('voiceSample', voiceBlob, 'enrollment.wav'); // Append audio blob.

        try {
            const token = sessionStorage.getItem("token");
            // Send voice enrollment request.
            await axios.post(`${API_BASE_URL}/proctoring/enroll-voice`, formData, {
                headers: { 'Authorization': `Bearer ${token}` } // Include authorization token.
            });
            setStep('success'); // Transition to success step.
        } catch (err) {
            console.error("Voice enrollment failed:", err);
            setError(err.response?.data?.message || 'Failed to enroll voice.');
        } finally {
            setIsProcessing(false); // End processing.
            setIsRecording(false); // End recording.
            // Clear the recorder reference without stopping the media stream tracks, as they are needed globally.
            recorderRef.current = null;
        }
    };

    /**
     * Effect hook for robust cleanup of media streams when the component unmounts.
     */
    useEffect(() => {
        // Cleanup function: stops all tracks in the media stream.
        return () => {
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
            }
            // `clearMediaStream()` is not called here, as the new page will take over the stream.
        };
    }, []); // Empty dependency array means this runs only on mount and unmount.

    /**
     * Handles proceeding to the assessment questions page after successful verification.
     * Stops current media streams and clears them from the global store before navigating.
     * Uses useCallback for memoization.
     */
    const handleProceedToAssessment = useCallback(() => {
        // Stop all tracks in the current media stream.
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
        }
        clearMediaStream(); // Clear the stream from the global Zustand store.

        navigate(`/assessment/${assessmentId}/questions`); // Navigate to assessment questions.
    }, [assessmentId, navigate, clearMediaStream]); // Dependencies: assessmentId, navigate, clearMediaStream.

    /**
     * Effect hook to determine the initial verification step based on camera/mic permission status.
     * Triggers `startCameraAndMic` if permissions are granted.
     */
    useEffect(() => {
        if (permissionStatus === 'granted') {
            startCameraAndMic();
        } else if (permissionStatus === 'prompt') {
            setStep('permission_prompt');
        } else if (permissionStatus === 'denied') {
            setStep('permission_blocked');
        }
    }, [permissionStatus, startCameraAndMic]); // Dependencies: permissionStatus, startCameraAndMic.

    /**
     * Renders the appropriate content view based on the current `step` state.
     * @returns {JSX.Element} The current step's UI.
     */
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
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full overflow-hidden">
                {/* Header for the verification page */}
                <div className="bg-blue-600 dark:bg-blue-800 px-6 py-4">
                    <h1 className="text-white text-2xl font-bold text-center">Identity Verification</h1>
                    <p className="text-blue-200 dark:text-blue-300 text-center mt-1 text-sm">Secure Assessment Portal</p>
                </div>
                {/* Content area based on current verification step */}
                <div className="p-2 sm:p-4">{renderContent()}</div>
            </div>
        </div>
    );
};

export default VerificationPage;