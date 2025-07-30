import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';
import he from 'he';
import debounce from 'lodash/debounce';
import { ArrowLeft, ArrowRight, MonitorX, PlayCircle, Timer, Camera, Mic, AlertTriangle, ShieldX } from 'lucide-react';
import Loader from '../../../components/Loader';
import useFullscreen from '../../../hooks/useFullScreen';
import useProctoringStore from '../../../stores/proctoringStore';
import useExamSecurity from '../../../hooks/useExamSecurity';
import { areDevToolsOpen } from '../../../utils/devtools';

// --- Proctoring Configuration ---
const API_BASE_URL = 'http://localhost:5000'; // For main backend (questions, submission)
const PROCTORING_API_URL = 'http://localhost:5001/api'; // For Python proctoring service
const COMPREHENSIVE_CHECK_INTERVAL = 2000; // Check every 2 seconds for "continuous" monitoring
const VERIFICATION_INTERVAL = 15000;      // Verify face every 15 seconds
const AWAY_VIOLATION_THRESHOLD = 2;       // Trigger violation after 2 consecutive 'away' checks (~4s)
const MAX_VIOLATIONS = 1000;

const AssessmentPage = () => {
    const { assessmentId } = useParams();
    const navigate = useNavigate();
    
    // --- State: Assessment ---
    const [questions, setQuestions] = useState([]);
    const [answeredQuestions, setAnsweredQuestions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusMessage, setStatusMessage] = useState('');
    const [statusTitle, setStatusTitle] = useState('Assessment Ended');
    const [remainingTime, setRemainingTime] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);
    const [questionsPerPage] = useState(5);
    const [examDurationMinutes, setExamDurationMinutes] = useState(0);
    const [examStartTime, setExamStartTime] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);

    // --- State: Proctoring ---
    const { setMediaStream, clearMediaStream } = useProctoringStore();
    const [violations, setViolations] = useState([]);
    const [warnings, setWarnings] = useState([]);
    const [violationCount, setViolationCount] = useState(0);
    const [showDevToolsWarning, setShowDevToolsWarning] = useState(false);
    const [monitoringStatus, setMonitoringStatus] = useState('Initializing...');
    const [cameraStatus, setCameraStatus] = useState('Initializing');
    const [micStatus, setMicStatus] = useState('Initializing');
    const [videoReady, setVideoReady] = useState(false);

    // --- Refs ---
    const socketRef = useRef(null);
    const videoRef = useRef(null);
    const proctoringIntervalRef = useRef(null);
    const isTerminatingRef = useRef(false);
    const lastVerificationTimeRef = useRef(0);
    const awayCounterRef = useRef(0);

    // --- Core Proctoring Functions ---
    const logProctoringEvent = useCallback((eventData, extraInfo = {}) => {
        // This function now expects an object like { type, severity }
        // or a simple string for backward compatibility with other parts of the code.
        const isEventObject = typeof eventData === 'object' && eventData !== null && eventData.type;

        const type = isEventObject ? eventData.type : eventData;
        
        // *** THIS IS THE KEY CHANGE ***
        // We now determine severity from the event object.
        // Fullscreen exit is also a violation.
        const isViolation = (isEventObject && eventData.severity === 'violation');
        
        const timestamp = new Date().toLocaleTimeString();
        let message = `[${timestamp}] ${type}`;

        // Keep the specific message formatting for certain events
        if (type === 'Multiple people detected') message = `[${timestamp}] Multiple people detected (${extraInfo.person_count})`;
        if (type === 'Banned objects detected') message = `[${timestamp}] Banned objects detected: ${extraInfo.banned_objects.join(', ')}`;
        
        if (isViolation) {
            setViolations(prev => [...prev, message]);
            setViolationCount(prevCount => prevCount + 1);
            socketRef.current?.emit('violation_event', { assessmentId, type, timestamp: new Date().toISOString() });
        } else {
            setWarnings(prev => {
                // Prevent spamming the same warning repeatedly
                if (prev.length > 0 && prev[prev.length - 1].includes(type)) {
                    return prev; 
                }
                return [...prev, message];
            });
        }
    }, [assessmentId]);

    const captureVideoFrame = useCallback(async () => {
        if (!videoRef.current || !videoReady || videoRef.current.readyState < 3) {
            console.warn("captureVideoFrame: Video not ready or element not available.");
            return null;
        }
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
        return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
    }, [videoReady]);
    
    const performComprehensiveCheck = useCallback(async () => {
        if (isTerminatingRef.current) return;
        
        const frameBlob = await captureVideoFrame();
        if (!frameBlob) {
            console.warn("[FRONTEND] Comprehensive check skipped: could not capture frame.");
            return;
        }

        const formData = new FormData();
        formData.append('frame', frameBlob, 'proctor_frame.jpg');
        
        const studentId = 'student1'; 
        formData.append('studentId', studentId);

        const now = Date.now();
        if (now - lastVerificationTimeRef.current > VERIFICATION_INTERVAL) {
            formData.append('perform_face_verification', 'true');
            lastVerificationTimeRef.current = now;
        }

        try {
            const token = sessionStorage.getItem("token");
            const { data } = await axios.post(`${API_BASE_URL}/api/v1/proctoring/comprehensive-check`, formData, { headers: { 'Authorization': `Bearer ${token}` } });
            
            console.log("[FRONTEND] Proctoring check response:", data);
            
            // --- REFACTORED LOGIC ---
            if (data.person_count === 0) {
                logProctoringEvent('No person detected in the frame.');
            } else if (data.person_count > 1) {
                logProctoringEvent('Multiple people detected', { person_count: data.person_count });
            } else if (data.person_count === 1 && !data.face_detected) {
                logProctoringEvent('Person detected, but face is not visible.');
            }
            
            if (data.banned_objects && data.banned_objects.length > 0) {
                logProctoringEvent('Banned objects detected', { banned_objects: data.banned_objects });
            }

            // --- CORRECTED SEVERITY ---
            if (data.face_verified === false) {
                // Pass an object to correctly classify this as a violation
                logProctoringEvent('Face mismatch detected');
            } else if (data.face_verified === "student_image_not_found" || data.face_verified === "enrollment_data_not_received") {
                logProctoringEvent('CRITICAL: Student not enrolled or reference image not found on server.');
            }

            if (data.mouth_open === true) {
                logProctoringEvent('Mouth open detected (possible talking)');
            }

            if (data.head_pose === 'away' || data.eye_gaze === 'away') {
                awayCounterRef.current += 1;
                if (awayCounterRef.current >= AWAY_VIOLATION_THRESHOLD) {
                    logProctoringEvent('Looking away from screen');
                    awayCounterRef.current = 0;
                }
            } else {
                awayCounterRef.current = 0;
            }

        } catch (error) {
            console.error("[FRONTEND] Comprehensive check failed:", error.response?.data || error.message);
            setMonitoringStatus('Error');
        }
    }, [captureVideoFrame, logProctoringEvent]);

    // This useEffect now has a stable dependency array and will only run when `hasStarted` changes.
    useEffect(() => {
        if (!hasStarted) return;

        let isComponentMounted = true;
        let localStream = null;

        const stopAllMonitoring = () => {
            if (proctoringIntervalRef.current) clearInterval(proctoringIntervalRef.current);
        };

        const initializeProctoring = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: true });
                localStream = stream;
                if (!isComponentMounted) {
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }
                setMediaStream(stream);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => setVideoReady(true);
                    videoRef.current.play().catch(e => console.error('Video play failed:', e));
                }
                socketRef.current = io(API_BASE_URL, { reconnection: false });
                socketRef.current.emit('join_assessment_room', assessmentId);

                const videoTrack = stream.getVideoTracks()[0];
                const audioTrack = stream.getAudioTracks()[0];
                if (videoTrack) {
                    setCameraStatus('Connected');
                    videoTrack.onended = () => { setCameraStatus('Disconnected'); logProctoringEvent('CRITICAL: Camera was disconnected.'); };
                }
                if (audioTrack) {
                    setMicStatus('Connected');
                    audioTrack.onended = () => { setMicStatus('Disconnected'); logProctoringEvent('CRITICAL: Microphone was disconnected.'); };
                }

                const proctoringStartTimeout = setTimeout(() => {
                    if (!isComponentMounted) return;
                    setMonitoringStatus('Active');
                    performComprehensiveCheck();
                    proctoringIntervalRef.current = setInterval(performComprehensiveCheck, COMPREHENSIVE_CHECK_INTERVAL);
                }, 3000);

            } catch (err) {
                if (isComponentMounted) {
                    setStatusTitle('Proctoring Error');
                    setStatusMessage("Could not access camera/microphone. Please allow permissions and refresh.");
                }
            }
        };

        initializeProctoring();

        return () => {
            isComponentMounted = false;
            stopAllMonitoring();
            if (socketRef.current) socketRef.current.disconnect();
            if (localStream) localStream.getTracks().forEach(track => track.stop());
            clearMediaStream();
        };
    }, [hasStarted, assessmentId, setMediaStream, clearMediaStream, performComprehensiveCheck, logProctoringEvent]);

    const handleExitFullscreen = useCallback(() => { 
        if (hasStarted && !isTerminatingRef.current) {
            // --- CORRECTED SEVERITY ---
            // Pass an object to correctly classify this as a violation
            logProctoringEvent({ type: 'Exited fullscreen mode', severity: 'violation' });
        }
    }, [hasStarted, logProctoringEvent]);

    
    useExamSecurity(logProctoringEvent, hasStarted);

    const { isFullscreen, requestFullscreen, exitFullscreen } = useFullscreen(handleExitFullscreen);
    
    const debouncedSaveProgress = useCallback(debounce(async (answersToSave) => { 
        try { 
            await axios.post(`${API_BASE_URL}/api/v1/assessments/${assessmentId}/save-progress`, { answeredquestions: answersToSave }, { headers: { 'Authorization': `Bearer ${sessionStorage.getItem("token")}` } }); 
        } catch (error) { console.error("Failed to save progress:", error); } 
    }, 1500), [assessmentId]);
    
    const handleSubmit = useCallback(async (isAutoSubmit = false) => {
        if (isSubmitting) return;

        // --- CORRECTED LOGIC ---
        // 1. Signal that we are terminating to prevent violation logging
        isTerminatingRef.current = true;

        // 2. Check if in fullscreen and then call the exit function
        if (isFullscreen) {
            exitFullscreen(); // Call the function with parentheses
        }
        
        setIsSubmitting(true);
        if (!isAutoSubmit) setShowConfirmModal(false);

        try {
            const payload = { 
                answers: questions.map((q, i) => ({ questionId: q.id, selectedAnswer: answeredQuestions[i] })), 
                violations: violations, 
                violationCount: violationCount 
            };
            const response = await axios.post(`${API_BASE_URL}/api/v1/assessments/${assessmentId}/submit`, payload, { headers: { 'Authorization': `Bearer ${sessionStorage.getItem("token")}` } });
            sessionStorage.removeItem(`examStart_${assessmentId}`);
            
            // Set the final status message regardless of the ref
            setStatusTitle('Assessment Submitted');
            setStatusMessage(response.data.message);
            
            setQuestions([]);
        } catch (error) {
            setStatusTitle('Submission Error');
            setStatusMessage('Failed to submit assessment. Please try again.');
            setIsSubmitting(false);
        }
    }, [
        assessmentId, 
        questions, 
        answeredQuestions, 
        violations, 
        violationCount, 
        isSubmitting, 
        isFullscreen, // Add isFullscreen to dependencies
        exitFullscreen  // Add exitFullscreen to dependencies
    ]);


    const handleOptionChange = (qIndex, option) => { 
        const newAnswers = [...answeredQuestions]; 
        newAnswers[qIndex] = option; 
        setAnsweredQuestions(newAnswers); 
        debouncedSaveProgress(questions.map((q, i) => ({ questionId: q.id, selectedOption: newAnswers[i] }))); 
    };
    
    const startAssessment = () => { 
        // 3. Add the check before starting
        if (areDevToolsOpen()) {
            setShowDevToolsWarning(true);
            return; // Stop the assessment from starting
        }

        // If the check passes, proceed as normal
        setShowDevToolsWarning(false);
        requestFullscreen(); 
        setHasStarted(true); 
    };

    
    const handleQuestionClick = (index) => { 
        const newPage = Math.floor(index / questionsPerPage); 
        setCurrentPage(newPage); 
        setTimeout(() => { document.getElementById(`question-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100); 
    };
    
    useEffect(() => {
        const fetchPageData = async () => {
            const token = sessionStorage.getItem("token");
            if (!token) { navigate('/login'); return; }
            try {
                const { data } = await axios.get(`${API_BASE_URL}/api/v1/assessments/${assessmentId}/page-data`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (data.status === 'not_opened' || data.status === 'closed') {
                    setStatusTitle('Assessment Unavailable');
                    setStatusMessage(`This assessment is currently ${data.status}.`);
                } else {
                    setQuestions(data.questions);
                    setExamDurationMinutes(data.assessment.examDurationMinutes);
                    const storedStartTime = sessionStorage.getItem(`examStart_${assessmentId}`);
                    const newStartTime = storedStartTime ? new Date(storedStartTime) : new Date();
                    if (!storedStartTime) sessionStorage.setItem(`examStart_${assessmentId}`, newStartTime.toISOString());
                    setExamStartTime(newStartTime);
                    const answersMap = new Map(data.savedAnswers.map(a => [a.questionId, a.selectedOption]));
                    setAnsweredQuestions(data.questions.map(q => answersMap.get(q.id) || null));
                }
            } catch (err) {
                setStatusTitle('Loading Failed');
                setStatusMessage(err.response?.data?.message || 'Failed to load assessment.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchPageData();
    }, [assessmentId, navigate]);
    
    useEffect(() => { 
        if (!hasStarted || !examDurationMinutes || isSubmitting || !examStartTime || isTerminatingRef.current) return; 
        const examEndTime = new Date(examStartTime.getTime() + examDurationMinutes * 60000); 
        const timer = setInterval(() => { 
            const remaining = Math.max(0, examEndTime - new Date()); 
            setRemainingTime(remaining); 
            if (remaining <= 0 && !isSubmitting) { 
                clearInterval(timer); 
                setStatusTitle("Time's Up!"); 
                setStatusMessage("Time has run out. Your assessment will be submitted automatically."); 
            } 
        }, 1000); 
        return () => clearInterval(timer); 
    }, [examStartTime, examDurationMinutes, isSubmitting, hasStarted]);
    
    useEffect(() => {
        if (hasStarted && !isSubmitting && (violationCount >= MAX_VIOLATIONS || statusMessage.startsWith("Time has run out"))) {
            handleSubmit(true);
        }
    }, [statusMessage, violationCount, hasStarted, isSubmitting, handleSubmit]);
    
    if (isLoading) return <Loader />;
    
    const decodeHtmlEntities = (text) => he.decode(text || '');
    const formatTime = (ms) => { 
        const totalSeconds = Math.floor(ms / 1000); 
        const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0'); 
        const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0'); 
        const s = String(totalSeconds % 60).padStart(2, '0'); 
        return `${h}:${m}:${s}`; 
    };
    
    if (statusMessage && !statusMessage.startsWith("Could not access")) { 
        return (
            <div className="flex items-center justify-center min-h-screen p-4 bg-slate-100">
                <div className='space-y-4 text-center'>
                    <div className="p-8 bg-white rounded-lg border-2 border-slate-200 shadow-lg flex flex-col justify-center items-center">
                        <h3 className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-4">{statusTitle}</h3>
                        <p className="mb-6">{statusMessage}</p>
                        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm font-semibold text-white bg-blue-600 px-4 py-2 rounded-lg transition hover:bg-blue-700">
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        ); 
    }
    
    if (!hasStarted) { 
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4">
                <div className="w-full max-w-lg text-center p-8 bg-white rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold text-slate-800 mb-4">Ready to Begin?</h2>
                    <p className="text-slate-600 mb-6">This assessment requires fullscreen mode and will monitor your activity to ensure integrity.</p>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center gap-2 text-amber-700 mb-2"><AlertTriangle size={18} /> <span className="font-semibold">Monitoring Notice</span></div>
                        <p className="text-sm text-amber-600">Your camera and microphone will be used. Ensure you're in a quiet, well-lit environment.</p>
                    </div>
                    {showDevToolsWarning && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 animate-pulse">
                            <div className="flex items-center gap-2 text-red-700 mb-2"><ShieldX size={18} /> <span className="font-semibold">Action Required</span></div>
                            <p className="text-sm text-red-600">Please close the browser's developer tools before starting the assessment.</p>
                        </div>
                    )}
                    <button onClick={startAssessment} className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                        <PlayCircle size={18} /> Start Assessment
                    </button>
                </div>
            </div>
        ); 
    }
    
    const totalPages = Math.ceil(questions.length / questionsPerPage);
    const currentQuestions = questions.slice(currentPage * questionsPerPage, (currentPage + 1) * questionsPerPage);

    return (
        <div className="relative flex flex-col lg:flex-row gap-6 p-4 md:p-6 bg-slate-50 min-h-screen">
            
            {!isFullscreen && hasStarted && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="w-full max-w-lg text-center p-8 bg-white rounded-xl shadow-lg">
                        <MonitorX className="mx-auto w-16 h-16 text-amber-500 mb-4" />
                        <h2 className="text-2xl font-bold text-slate-800">Fullscreen Required</h2>
                        <p className="mt-2 text-slate-600">For a secure experience, this test must be taken in fullscreen mode.</p>
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm font-semibold text-red-600">Violations detected: {violationCount} / {MAX_VIOLATIONS}</p>
                            <p className="text-xs text-red-500 mt-1">Please re-enter fullscreen to continue.</p>
                        </div>
                        <button onClick={requestFullscreen} className="mt-6 inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                            <PlayCircle size={18} /> Re-enter Fullscreen
                        </button>
                    </div>
                </div>
            )}

            <div className="w-full lg:w-2/3">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                    <div className="p-5 md:p-6">
                        {currentQuestions?.map((question, index) => {
                            const globalIndex = currentPage * questionsPerPage + index;
                            return (
                                <div className="pb-6 mb-6 border-b border-slate-200 last:border-b-0 last:mb-0" key={globalIndex} id={`question-${globalIndex}`}>
                                    <h4 className="font-semibold text-slate-800 mb-2">Question {globalIndex + 1}</h4>
                                    <p className="text-slate-700 mb-3">{decodeHtmlEntities(question?.question)}</p>
                                    <p className="inline-block bg-slate-100 text-slate-600 text-xs font-medium px-2 py-1 rounded-md mb-4">Marks: {question?.mark}</p>
                                    <div className="space-y-3">
                                        {question?.options?.map((option, optIndex) => (
                                            <label key={optIndex} className="flex items-center p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 has-[:checked]:bg-blue-50 has-[:checked]:border-blue-400">
                                                <input type="radio" name={`q-${globalIndex}`} value={option} checked={answeredQuestions[globalIndex] === option} onChange={() => handleOptionChange(globalIndex, option)} className="w-4 h-4 mr-3 text-blue-600 focus:ring-blue-500"/>
                                                <span>{decodeHtmlEntities(option)}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between items-center p-4 border-t border-slate-200">
                        <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 0} className="px-4 py-2 text-sm font-semibold bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                            <ArrowLeft size={16} />Previous
                        </button>
                        <span className="text-sm text-slate-500">Page {currentPage + 1} of {totalPages}</span>
                        <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages - 1} className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                            Next<ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
            <div className="w-full lg:w-1/3">
                <div className="lg:sticky lg:top-6 space-y-6">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-center">
                        <div className={`flex items-center justify-center gap-2 mb-2 ${remainingTime <= 300000 ? 'text-red-500' : 'text-slate-600'}`}>
                            <Timer size={18} />
                            <span className="text-xl font-medium">{formatTime(remainingTime)}</span>
                        </div>
                        {remainingTime <= 300000 && remainingTime > 0 && (<p className="text-xs text-red-500">Less than 5 minutes remaining!</p>)}
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="text-xs font-semibold text-blue-500 uppercase tracking-wider pb-3 mb-4 border-b border-slate-200">Monitoring Status</h4>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Camera size={16} /><span className="text-sm">Camera</span></div><span className={`text-xs font-semibold px-2 py-1 rounded-full ${cameraStatus === 'Connected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{cameraStatus}</span></div>
                            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Mic size={16} /><span className="text-sm">Microphone</span></div><span className={`text-xs font-semibold px-2 py-1 rounded-full ${micStatus === 'Connected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{micStatus}</span></div>
                            <div className="flex items-center justify-between"><span className="text-sm">Status</span><span className={`text-xs font-semibold px-2 py-1 rounded-full ${monitoringStatus === 'Active' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-700'}`}>{monitoringStatus}</span></div>
                        </div>
                        <div className="mt-4 rounded-lg overflow-hidden border border-slate-300">
                            <div className="bg-[#0f172a] aspect-video relative">
                                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform -scale-x-100" />
                                {!videoReady && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-800 text-white">
                                        <div className="text-center">
                                            <Camera size={24} className="mx-auto mb-2 opacity-50 animate-pulse" />
                                            <p className="text-sm opacity-75">Initializing camera...</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {warnings.length > 0 && (
                        <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertTriangle size={16} className="text-amber-500" />
                                <h4 className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Warnings</h4>
                            </div>
                            <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                                {warnings.slice().reverse().map((warning, index) => (
                                    <div key={index} className="text-xs text-amber-700 bg-amber-50 p-2 rounded">
                                        {warning}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {violationCount > 0 && (
                        <div className="bg-white p-5 rounded-xl border border-red-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-3"><AlertTriangle size={16} className="text-red-500" /><h4 className="text-xs font-semibold text-red-500 uppercase tracking-wider">Violations ({violationCount}/{MAX_VIOLATIONS})</h4></div>
                            <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                                {violations.slice().reverse().map((violation, index) => (<div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">{violation}</div>))}
                            </div>
                            {violationCount >= MAX_VIOLATIONS - 1 && (<div className="mt-3 p-2 bg-red-100 border border-red-200 rounded-lg"><p className="text-xs text-red-700 font-semibold">Warning: Next violation will auto-submit!</p></div>)}
                        </div>
                    )}

                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="text-xs font-semibold text-blue-500 uppercase tracking-wider pb-3 mb-4 border-b border-slate-200">Question Navigation</h4>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {questions.map((_, index) => (<button key={index} onClick={() => handleQuestionClick(index)} className={`w-9 h-9 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${answeredQuestions[index] ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>{index + 1}</button>))}
                        </div>
                        <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                            <div className="flex justify-between text-sm"><span>Answered:</span><span className="font-semibold">{answeredQuestions.filter(a => a !== null).length} / {questions.length}</span></div>
                            <div className="w-full bg-slate-200 rounded-full h-2 mt-2"><div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${(answeredQuestions.filter(a => a !== null).length / questions.length) * 100}%` }} /></div>
                        </div>
                        <button onClick={() => setShowConfirmModal(true)} disabled={isSubmitting} className="w-full px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-300 flex items-center justify-center gap-2">{isSubmitting ? 'Submitting...' : 'End Assessment'}</button>
                    </div>
                </div>
            </div>
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">Submit Assessment?</h3>
                        <p className="text-sm text-slate-600 mb-4">Are you sure you want to end your assessment? This cannot be undone.</p>
                        <div className="bg-slate-50 p-4 rounded-lg mb-4 space-y-2 text-sm">
                            <div className="flex justify-between"><span>Answered:</span><span className="font-semibold">{answeredQuestions.filter(a => a !== null).length} / {questions.length}</span></div>
                            <div className="flex justify-between"><span>Violations:</span><span className={`font-semibold ${violationCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{violationCount}</span></div>
                            <div className="flex justify-between"><span>Time Remaining:</span><span className="font-semibold">{formatTime(remainingTime)}</span></div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowConfirmModal(false)} disabled={isSubmitting} className="px-4 py-2 text-sm font-semibold bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 disabled:opacity-50">Cancel</button>
                            <button onClick={() => handleSubmit()} disabled={isSubmitting} className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">{isSubmitting ? 'Submitting...' : 'Yes, Submit'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssessmentPage;