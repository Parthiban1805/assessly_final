import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { usePermissions } from '../../hooks/usePermissions'; // Custom hook for camera/mic permissions
import { Camera, CheckCircle, ShieldX, XCircle } from 'lucide-react'; // Icons for UI feedback
import Loader from '../../components/Loader'; // Global loading spinner
import { API_BASE_URL } from '../../config/constants'; // Import the common API base URL

/**
 * EnrollmentPage component guides students through the process of enrolling their face
 * for proctored assessments. It handles camera access, photo capture, and enrollment.
 *
 * @returns {JSX.Element} The face enrollment UI.
 */
const EnrollmentPage = () => {
    const navigate = useNavigate(); // Hook for programmatic navigation.
    const { status: permissionStatus } = usePermissions(); // Get camera/mic permission status.

    // State to manage the current view/step of the enrollment process.
    const [view, setView] = useState('loading'); // Possible values: 'loading', 'permission_prompt', 'permission_denied', 'camera', 'captured', 'processing', 'success', 'error'.
    // State to store any error messages specific to the enrollment process.
    const [error, setError] = useState(null);
    // State to store the Data URL of the captured image.
    const [capturedImage, setCapturedImage] = useState(null);

    // Refs for DOM elements to interact with media.
    const videoRef = useRef(null); // Reference to the video element for camera stream.
    const canvasRef = useRef(null); // Reference to the canvas element for image capture.
    const mediaStreamRef = useRef(null); // Reference to the active media stream (camera).

    /**
     * Starts the camera stream and sets it to the video element.
     * Uses useCallback to memoize this function, preventing unnecessary re-creation.
     */
    const startCamera = useCallback(async () => {
        // Prevent starting camera if a stream is already active.
        if (mediaStreamRef.current) return;
        try {
            // Request video stream from user's media devices.
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
            mediaStreamRef.current = stream; // Store the stream.
            if (videoRef.current) { // Ensure video element is available.
                videoRef.current.srcObject = stream; // Attach stream to video element.
                videoRef.current.play().catch(e => console.error('Video play failed:', e)); // Attempt to play video.
            }
            setView('camera'); // Transition to camera view.
        } catch (err) {
            console.error("Failed to start camera:", err);
            setView('error'); // Transition to error view.
            setError("Camera access is required. Please grant permission in your browser settings and refresh.");
        }
    }, []); // Empty dependency array, as it only needs to be created once.

    /**
     * Effect hook to determine the initial view based on camera/mic permission status.
     * Cleans up media stream on component unmount.
     */
    useEffect(() => {
        if (permissionStatus === 'granted') startCamera(); // If granted, immediately try to start camera.
        else if (permissionStatus === 'prompt') setView('permission_prompt'); // If needs prompt, show prompt view.
        else if (permissionStatus === 'denied') setView('permission_denied'); // If denied, show denied view.

        // Cleanup function: stops all tracks in the media stream when component unmounts.
        return () => {
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [permissionStatus, startCamera]); // Dependencies: permissionStatus, startCamera.

    /**
     * Effect hook to ensure the video stream is attached to the video element
     * when the view transitions to 'camera'.
     */
    useEffect(() => {
        if (view === 'camera' && videoRef.current && mediaStreamRef.current) {
            videoRef.current.srcObject = mediaStreamRef.current;
        }
    }, [view]); // Dependency: view state.

    /**
     * Captures a photo from the video stream onto a canvas and sets it as the captured image.
     */
    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            // Set canvas dimensions to match video.
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Draw the video frame onto the canvas, flipping horizontally for mirror effect.
            context.scale(-1, 1); // Flip horizontally.
            context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
            context.setTransform(1, 0, 0, 1, 0, 0); // Reset transform after drawing.

            setCapturedImage(canvas.toDataURL('image/jpeg')); // Get image as Data URL.
            setView('captured'); // Transition to captured image view.
        }
    };

    /**
     * Allows the user to retake the photo by clearing the captured image and returning to camera view.
     */
    const handleRetake = () => {
        setCapturedImage(null);
        setView('camera');
    };

    /**
     * Handles the enrollment process: converts the captured image to a Blob and sends it to the backend.
     * Displays success or error feedback.
     */
    const handleEnroll = async () => {
        setError(null); // Clear previous errors.
        setView('processing'); // Transition to processing view.

        if (!capturedImage) {
            setError("No image was captured.");
            setView('error');
            return;
        }

        const canvas = canvasRef.current;
        // Convert canvas content to a Blob (file-like object).
        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append('enrollmentPhoto', blob, 'enrollment.jpg'); // Append image blob.

            try {
                const token = sessionStorage.getItem("token");
                // Send enrollment request to the backend.
                await axios.post(`${API_BASE_URL}/proctoring/enroll-face`, formData, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } // Include token and content type.
                });
                setView('success'); // Transition to success view.
            } catch (err) {
                console.error("Enrollment failed:", err);
                // Set error message from API response or a generic one.
                setError(err.response?.data?.message || 'An unknown error occurred during enrollment.');
                setView('error'); // Transition to error view.
            }
        }, 'image/jpeg'); // Specify image format for Blob.
    };

    /**
     * Helper component for consistent page structure and styling.
     * @param {object} props - Component props.
     * @param {string} props.title - Main title of the section.
     * @param {string} props.subtitle - Subtitle/description of the section.
     * @param {React.ReactNode} props.children - Content to be rendered within the wrapper.
     * @returns {JSX.Element} A styled page wrapper.
     */
    const PageWrapper = ({ title, subtitle, children }) => (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-3xl">
            <header className="p-6 border-b border-slate-200 dark:border-gray-700">
                <h1 className="text-xl font-semibold text-slate-800 dark:text-white">{title}</h1>
                <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">{subtitle}</p>
            </header>
            <div className="p-6 sm:p-8">
                {children}
            </div>
            {/* Hidden canvas for capturing frames (placed here for accessibility within the wrapper's scope) */}
            <canvas ref={canvasRef} className="hidden"></canvas>
        </div>
    );

    // Render logic based on the current `view` state.
    return (
        <div className="h-[90vh] bg-slate-100 dark:bg-gray-900 flex items-center justify-center p-4">
            {view === 'loading' && <Loader />}

            {view === 'permission_prompt' && (
                <PageWrapper title="Step 1: Grant Camera Access" subtitle="We need your permission to use the camera for enrollment.">
                    <div className="text-center space-y-6">
                        <Camera className="mx-auto w-20 h-20 text-slate-300 dark:text-gray-600" />
                        <p className="text-slate-600 dark:text-gray-300">Please click the button below and then "Allow" in the browser prompt that appears.</p>
                        <button onClick={startCamera} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors">
                            Grant Camera Access
                        </button>
                    </div>
                </PageWrapper>
            )}

            {view === 'permission_denied' && (
                <PageWrapper title="Camera Access Denied" subtitle="Permission is required to continue.">
                    <div className="text-center bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-6 space-y-4">
                        <ShieldX className="mx-auto w-16 h-16 text-red-400 dark:text-red-300" />
                        <h3 className="text-lg font-bold text-red-800 dark:text-red-300">Permission Required</h3>
                        <p className="text-red-700 dark:text-red-400">You have denied camera access. You must enable camera permissions for this site in your browser's settings and then refresh the page.</p>
                    </div>
                </PageWrapper>
            )}

            {view === 'camera' && (
                 <PageWrapper title="Step 2: Capture Your Photo" subtitle="Position your face in the center of the frame and click 'Capture'.">
                    <div className="flex flex-col items-center space-y-6">
                        <div className="w-full max-w-lg aspect-video bg-slate-900 dark:bg-gray-950 rounded-lg overflow-hidden border-2 border-slate-300 dark:border-gray-600">
                            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform -scale-x-100" />
                        </div>
                        <button onClick={handleCapture} className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors flex items-center gap-2">
                            <Camera size={20} /> Capture
                        </button>
                    </div>
                </PageWrapper>
            )}

            {view === 'captured' && (
                <PageWrapper title="Step 3: Confirm Your Photo" subtitle="If you're happy with the photo, proceed to enroll.">
                    <div className="flex flex-col items-center space-y-6">
                        <img src={capturedImage} alt="Captured" className="w-full max-w-lg aspect-video bg-slate-900 dark:bg-gray-950 rounded-lg overflow-hidden border-2 border-slate-300 dark:border-gray-600"/>
                        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                            <button onClick={handleRetake} className="w-full sm:w-auto bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-gray-200 px-6 py-2.5 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-gray-600 transition-colors">
                                Retake Photo
                            </button>
                            <button onClick={handleEnroll} className="w-full sm:w-auto bg-green-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-green-700 dark:hover:bg-green-500 transition-colors">
                                Looks Good, Enroll Me
                            </button>
                        </div>
                    </div>
                </PageWrapper>
            )}

            {view === 'processing' && (
                 <PageWrapper title="Processing Enrollment" subtitle="Please wait a moment while we register your photo.">
                    <div className="text-center py-12 space-y-4">
                        <Loader />
                        <p className="text-slate-600 dark:text-gray-300 mt-4">Analyzing and saving your enrollment data...</p>
                    </div>
                </PageWrapper>
            )}

            {view === 'success' && (
                <PageWrapper title="Enrollment Complete!" subtitle="You are now ready to proceed with proctored assessments.">
                    <div className="text-center py-12 space-y-4">
                        <CheckCircle className="mx-auto w-20 h-20 text-green-500 dark:text-green-400" />
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-white">You're All Set!</h3>
                        <p className="text-slate-600 dark:text-gray-300">Your face has been successfully registered with the system.</p>
                        <button onClick={() => navigate('/dashboard')} className="mt-4 bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors">
                            Go to Dashboard
                        </button>
                    </div>
                </PageWrapper>
            )}

            {view === 'error' && (
                <PageWrapper title="An Error Occurred" subtitle="Something went wrong during the enrollment process.">
                     <div className="text-center bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-6 space-y-4">
                        <XCircle className="mx-auto w-16 h-16 text-red-400 dark:text-red-300" />
                        <h3 className="text-lg font-bold text-red-800 dark:text-red-300">Enrollment Failed</h3>
                        <p className="text-red-700 dark:text-red-400">{error}</p>
                        <button onClick={handleRetake} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors">
                            Try Again
                        </button>
                    </div>
                </PageWrapper>
            )}
        </div>
    );
};

export default EnrollmentPage;
