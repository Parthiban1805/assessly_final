import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { usePermissions } from '../../hooks/usePermissions';
import { Camera, CheckCircle, ShieldX, XCircle } from 'lucide-react';
import Loader from '../../components/Loader';

const EnrollmentPage = () => {
    const navigate = useNavigate();
    const { status: permissionStatus, request: requestPermissions } = usePermissions();
    
    const [view, setView] = useState('loading'); // loading, camera, captured, processing, success, error
    const [error, setError] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const mediaStreamRef = useRef(null);

    const API_BASE_URL = 'http://localhost:5000/api/v1';

    // --- All your existing logic remains the same ---
    const startCamera = useCallback(async () => {
        if (mediaStreamRef.current) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
            mediaStreamRef.current = stream;
            setView('camera');
        } catch (err) {
            setView('error');
            setError("Camera access is required. Please grant permission in your browser settings and refresh.");
        }
    }, []);

    useEffect(() => {
        if (permissionStatus === 'granted') startCamera();
        else if (permissionStatus === 'prompt') setView('permission_prompt');
        else if (permissionStatus === 'denied') setView('permission_denied');
        
        return () => {
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [permissionStatus, startCamera]);

    useEffect(() => {
        if (view === 'camera' && videoRef.current && mediaStreamRef.current) {
            videoRef.current.srcObject = mediaStreamRef.current;
        }
    }, [view]);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context.scale(-1, 1);
            context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
            context.setTransform(1, 0, 0, 1, 0, 0);
            setCapturedImage(canvas.toDataURL('image/jpeg'));
            setView('captured');
        }
    };

    const handleRetake = () => {
        setCapturedImage(null);
        setView('camera');
    };

    const handleEnroll = async () => {
        setError(null);
        setView('processing');
        if (!capturedImage) {
            setError("No image was captured.");
            setView('error');
            return;
        }
        const canvas = canvasRef.current;
        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append('enrollmentPhoto', blob, 'enrollment.jpg');
            try {
                const token = sessionStorage.getItem("token");
                await axios.post(`${API_BASE_URL}/proctoring/enroll-face`, formData, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
                });
                setView('success');
            } catch (err) {
                setError(err.response?.data?.message || 'An unknown error occurred during enrollment.');
                setView('error');
            }
        }, 'image/jpeg');
    };

    // --- NEW: A helper component for consistent page structure ---
    const PageWrapper = ({ title, subtitle, children }) => (
        <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl">
            <header className="p-6 border-b border-slate-200">
                <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
                <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
            </header>
            <div className="p-6 sm:p-8">
                {children}
            </div>
            {/* Hidden canvas for capturing frames */}
            <canvas ref={canvasRef} className="hidden"></canvas>
        </div>
    );
    
    // --- Render logic with the new, polished UI ---
    return (
        <div className="h-[90vh] bg-slate-100 flex items-center justify-center p-4">
            {view === 'loading' && <Loader />}
            
            {view === 'permission_prompt' && (
                <PageWrapper title="Step 1: Grant Camera Access" subtitle="We need your permission to use the camera for enrollment.">
                    <div className="text-center space-y-6">
                        <Camera className="mx-auto w-20 h-20 text-slate-300" />
                        <p className="text-slate-600">Please click the button below and then "Allow" in the browser prompt that appears.</p>
                        <button onClick={requestPermissions} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                            Grant Camera Access
                        </button>
                    </div>
                </PageWrapper>
            )}

            {view === 'permission_denied' && (
                <PageWrapper title="Camera Access Denied" subtitle="Permission is required to continue.">
                    <div className="text-center bg-red-50 border border-red-200 rounded-lg p-6 space-y-4">
                        <ShieldX className="mx-auto w-16 h-16 text-red-400" />
                        <h3 className="text-lg font-bold text-red-800">Permission Required</h3>
                        <p className="text-red-700">You have denied camera access. You must enable camera permissions for this site in your browser's settings and then refresh the page.</p>
                    </div>
                </PageWrapper>
            )}

            {view === 'camera' && (
                 <PageWrapper title="Step 2: Capture Your Photo" subtitle="Position your face in the center of the frame and click 'Capture'.">
                    <div className="flex flex-col items-center space-y-6">
                        <div className="w-full max-w-lg aspect-video bg-slate-900 rounded-lg overflow-hidden border-2 border-slate-300">
                            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform -scale-x-100" />
                        </div>
                        <button onClick={handleCapture} className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                            <Camera size={20} /> Capture
                        </button>
                    </div>
                </PageWrapper>
            )}
            
            {view === 'captured' && (
                <PageWrapper title="Step 3: Confirm Your Photo" subtitle="If you're happy with the photo, proceed to enroll.">
                    <div className="flex flex-col items-center space-y-6">
                        <img src={capturedImage} alt="Captured" className="w-full max-w-lg aspect-video bg-slate-900 rounded-lg overflow-hidden border-2 border-slate-300"/>
                        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                            <button onClick={handleRetake} className="w-full sm:w-auto bg-slate-200 text-slate-700 px-6 py-2.5 rounded-lg font-semibold hover:bg-slate-300 transition-colors">
                                Retake Photo
                            </button>
                            <button onClick={handleEnroll} className="w-full sm:w-auto bg-green-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-green-700 transition-colors">
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
                        <p className="text-slate-600 mt-4">Analyzing and saving your enrollment data...</p>
                    </div>
                </PageWrapper>
            )}

            {view === 'success' && (
                <PageWrapper title="Enrollment Complete!" subtitle="You are now ready to proceed with proctored assessments.">
                    <div className="text-center py-12 space-y-4">
                        <CheckCircle className="mx-auto w-20 h-20 text-green-500" />
                        <h3 className="text-2xl font-bold text-slate-800">You're All Set!</h3>
                        <p className="text-slate-600">Your face has been successfully registered with the system.</p>
                        <button onClick={() => navigate('/dashboard')} className="mt-4 bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                            Go to Dashboard
                        </button>
                    </div>
                </PageWrapper>
            )}

            {view === 'error' && (
                <PageWrapper title="An Error Occurred" subtitle="Something went wrong during the enrollment process.">
                     <div className="text-center bg-red-50 border border-red-200 rounded-lg p-6 space-y-4">
                        <XCircle className="mx-auto w-16 h-16 text-red-400" />
                        <h3 className="text-lg font-bold text-red-800">Enrollment Failed</h3>
                        <p className="text-red-700">{error}</p>
                        <button onClick={handleRetake} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                            Try Again
                        </button>
                    </div>
                </PageWrapper>
            )}
        </div>
    );
};

export default EnrollmentPage;