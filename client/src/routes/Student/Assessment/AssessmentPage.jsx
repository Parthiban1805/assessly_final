import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';
import he from 'he'; // HTML entity decoder
import debounce from 'lodash/debounce'; // Debounce utility for saving progress
import { ArrowLeft, ArrowRight, MonitorX, PlayCircle, Timer, Camera, Mic, AlertTriangle, ShieldX } from 'lucide-react'; // Icons
import Loader from '../../../components/Loader'; // Global loading spinner
import useFullscreen from '../../../hooks/useFullScreen'; // Hook for fullscreen management
import useProctoringStore from '../../../stores/proctoringStore'; // Zustand store for media stream
import useExamSecurity from '../../../hooks/useExamSecurity'; // Hook for exam security events
import { areDevToolsOpen } from '../../../utils/devtools'; // Utility to detect developer tools
import { API_BASE_URL, PROCTORING_API_URL } from '../../../config/constants'; // Import common API URLs

// --- Proctoring Configuration Constants ---
const COMPREHENSIVE_CHECK_INTERVAL = 2000; // Interval for continuous proctoring checks (every 2 seconds)
const VERIFICATION_INTERVAL = 15000;      // Interval for facial verification (every 15 seconds)
const AWAY_VIOLATION_THRESHOLD = 2;       // Number of consecutive 'away' detections before triggering a violation
const MAX_VIOLATIONS = 1000;              // Maximum allowed violations before auto-submission

/**
 * AssessmentPage component handles the core logic for a proctored assessment.
 * It displays questions, manages timing, saves progress, and implements real-time proctoring.
 *
 * @returns {JSX.Element} The assessment taking interface.
 */
const AssessmentPage = () => {
    const { assessmentId } = useParams(); // Get assessment ID from URL parameters
    const navigate = useNavigate(); // Hook for programmatic navigation

    // --- State: Assessment Data & Progress ---
    const [questions, setQuestions] = useState([]); // Array of assessment questions
    const [answeredQuestions, setAnsweredQuestions] = useState([]); // Array of student's selected answers
    const [isLoading, setIsLoading] = useState(true); // Overall loading state for the page
    const [statusMessage, setStatusMessage] = useState(''); // Message displayed on final status screen (e.g., submission success/error)
    const [statusTitle, setStatusTitle] = useState('Assessment Ended'); // Title for final status screen
    const [remainingTime, setRemainingTime] = useState(0); // Time remaining for the assessment in milliseconds
    const [currentPage, setCurrentPage] = useState(0); // Current page of questions being displayed
    const [questionsPerPage] = useState(5); // Number of questions to display per page
    const [examDurationMinutes, setExamDurationMinutes] = useState(0); // Total duration of the exam in minutes
    const [examStartTime, setExamStartTime] = useState(null); // Timestamp when the exam officially started
    const [isSubmitting, setIsSubmitting] = useState(false); // Flag indicating if the assessment is being submitted
    const [showConfirmModal, setShowConfirmModal] = useState(false); // Controls visibility of the submission confirmation modal
    const [hasStarted, setHasStarted] = useState(false); // Flag indicating if the assessment has officially begun (after fullscreen/devtools checks)

    // --- State: Proctoring & Monitoring ---
    const { setMediaStream, clearMediaStream } = useProctoringStore(); // Zustand store for managing media stream
    const [violations, setViolations] = useState([]); // List of violation events (messages)
    const [warnings, setWarnings] = useState([]); // List of warning events (messages)
    const [violationCount, setViolationCount] = useState(0); // Total count of violations
    const [showDevToolsWarning, setShowDevToolsWarning] = useState(false); // Controls visibility of developer tools warning
    const [monitoringStatus, setMonitoringStatus] = useState('Initializing...'); // Current status of proctoring monitoring
    const [cameraStatus, setCameraStatus] = useState('Initializing'); // Status of camera connection
    const [micStatus, setMicStatus] = useState('Initializing'); // Status of microphone connection
    const [videoReady, setVideoReady] = useState(false); // Flag indicating if video stream is ready and playing

    // --- Refs for managing intervals, timeouts, and DOM elements ---
    const socketRef = useRef(null); // Ref for the Socket.IO connection
    const videoRef = useRef(null); // Ref for the video element displaying camera feed
    const proctoringIntervalRef = useRef(null); // Ref for the interval controlling comprehensive proctoring checks
    const isTerminatingRef = useRef(false); // Flag to signal if the exam is in the process of ending (submission/auto-submit)
    const lastVerificationTimeRef = useRef(0); // Timestamp of the last facial verification check
    const awayCounterRef = useRef(0); // Counter for consecutive 'looking away' detections

    // --- Core Proctoring Functions ---

    /**
     * Logs a proctoring event with a timestamp, type, and severity.
     * Updates local state for violations/warnings and emits the event to the server via Socket.IO.
     *
     * @param {string | object} eventData - Either a string for the event type (defaults to 'violation')
     *   or an object { type: string, severity: 'violation' | 'warning' | 'info' }.
     * @param {object} [extraInfo={}] - Additional data relevant to the event (e.g., person_count, banned_objects).
     */
    const logProctoringEvent = useCallback((eventData, extraInfo = {}) => {
        const isEventObject = typeof eventData === 'object' && eventData !== null && eventData.type;

        const type = isEventObject ? eventData.type : eventData;
        const severity = isEventObject ? eventData.severity : 'violation'; // Default to violation if string event

        const timestamp = new Date().toLocaleTimeString();
        let message = `[${timestamp}] ${type}`;

        // Customize message for specific event types.
        if (type === 'Multiple people detected') message = `[${timestamp}] Multiple people detected (${extraInfo.person_count})`;
        if (type === 'Banned objects detected') message = `[${timestamp}] Banned objects detected: ${extraInfo.banned_objects.join(', ')}`;

        if (severity === 'violation') {
            // Add to violations list and increment count.
            setViolations(prev => [...prev, message]);
            setViolationCount(prevCount => prevCount + 1);
            // Emit violation event to the server.
            socketRef.current?.emit('violation_event', { assessmentId, type, timestamp: new Date().toISOString() });
        } else { // Handle 'warning' or 'info' severity events.
            setWarnings(prev => {
                // Prevent spamming the same warning repeatedly if it's the last one.
                if (prev.length > 0 && prev[prev.length - 1].includes(type)) {
                    return prev;
                }
                return [...prev, message];
            });
        }
    }, [assessmentId]); // Dependency: assessmentId for Socket.IO event.

    /**
     * Captures a single video frame from the camera feed and converts it to a JPEG Blob.
     * @returns {Promise<Blob|null>} A Promise that resolves with the image Blob or null if video not ready.
     */
    const captureVideoFrame = useCallback(async () => {
        // Ensure video element is ready and playing before capturing.
        if (!videoRef.current || !videoReady || videoRef.current.readyState < 3) {
            console.warn("captureVideoFrame: Video not ready or element not available.");
            return null;
        }
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d').drawImage(videoRef.current, 0, 0); // Draw video frame onto canvas.
        return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg')); // Convert canvas to JPEG Blob.
    }, [videoReady]); // Dependency: videoReady state.

    /**
     * Performs a comprehensive proctoring check, including face detection, object detection,
     * and optional face verification against enrolled image.
     * Sends the captured frame and student ID to the proctoring backend.
     * Logs detected events as violations or warnings.
     */
    const performComprehensiveCheck = useCallback(async () => {
        if (isTerminatingRef.current) return; // Do not perform checks if exam is ending.

        const frameBlob = await captureVideoFrame();
        if (!frameBlob) {
            console.warn("[FRONTEND] Comprehensive check skipped: could not capture frame.");
            return;
        }

        const formData = new FormData();
        formData.append('frame', frameBlob, 'proctor_frame.jpg');

        // Placeholder for studentId - replace with actual student ID from auth context or session.
        const studentId = 'student1';
        formData.append('studentId', studentId);

        // Perform facial verification periodically (every VERIFICATION_INTERVAL).
        const now = Date.now();
        if (now - lastVerificationTimeRef.current > VERIFICATION_INTERVAL) {
            formData.append('perform_face_verification', 'true');
            lastVerificationTimeRef.current = now;
        }

        try {
            const token = sessionStorage.getItem("token");
            // Send comprehensive check request to the proctoring service.
            const { data } = await axios.post(`${API_BASE_URL}/proctoring/comprehensive-check`, formData, { headers: { 'Authorization': `Bearer ${token}` } });

            console.log("[FRONTEND] Proctoring check response:", data);

            // Log events based on proctoring service response.
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

            // Face verification status logging.
            if (data.face_verified === false) {
                // Classify as a violation.
                logProctoringEvent({ type: 'Face mismatch detected', severity: 'violation' });
            } else if (data.face_verified === "student_image_not_found" || data.face_verified === "enrollment_data_not_received") {
                logProctoringEvent('CRITICAL: Student not enrolled or reference image not found on server.');
            }

            if (data.mouth_open === true) {
                logProctoringEvent('Mouth open detected (possible talking)');
            }

            // Head pose and eye gaze monitoring with thresholding for 'away' violations.
            if (data.head_pose === 'away' || data.eye_gaze === 'away') {
                awayCounterRef.current += 1;
                if (awayCounterRef.current >= AWAY_VIOLATION_THRESHOLD) {
                    logProctoringEvent('Looking away from screen');
                    awayCounterRef.current = 0; // Reset counter after violation
                }
            } else {
                awayCounterRef.current = 0; // Reset counter if not looking away
            }

        } catch (error) {
            console.error("[FRONTEND] Comprehensive check failed:", error.response?.data || error.message);
            setMonitoringStatus('Error'); // Indicate error in monitoring status.
        }
    }, [captureVideoFrame, logProctoringEvent]); // Dependencies: captureVideoFrame, logProctoringEvent.

    /**
     * Effect hook to initialize proctoring (camera, microphone, Socket.IO, intervals)
     * once the assessment has officially started (`hasStarted` is true).
     * Cleans up all media streams and intervals on unmount or `hasStarted` change.
     */
    useEffect(() => {
        if (!hasStarted) return; // Only run if assessment has started.

        let isComponentMounted = true; // Flag to prevent state updates on unmounted component.
        let localStream = null; // Holds the local media stream.

        /** Stops all proctoring intervals. */
        const stopAllMonitoring = () => {
            if (proctoringIntervalRef.current) clearInterval(proctoringIntervalRef.current);
        };

        /** Initializes camera, microphone, and Socket.IO connection for proctoring. */
        const initializeProctoring = async () => {
            try {
                // Request access to camera and microphone.
                const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: true });
                localStream = stream; // Store local stream reference.
                if (!isComponentMounted) { // If component unmounted during async operation, stop tracks.
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }
                setMediaStream(stream); // Store stream in Zustand for global access.

                // Attach stream to video element and set videoReady flag.
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => setVideoReady(true);
                    videoRef.current.play().catch(e => console.error('Video play failed:', e));
                }

                // Initialize Socket.IO connection to the main backend for event logging.
                socketRef.current = io(API_BASE_URL, { reconnection: false });
                socketRef.current.emit('join_assessment_room', assessmentId); // Join a room for this assessment.

                // Set up event listeners for camera and microphone disconnection.
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

                // Start comprehensive proctoring checks after a short delay.
                const proctoringStartTimeout = setTimeout(() => {
                    if (!isComponentMounted) return;
                    setMonitoringStatus('Active');
                    performComprehensiveCheck(); // Perform initial check.
                    proctoringIntervalRef.current = setInterval(performComprehensiveCheck, COMPREHENSIVE_CHECK_INTERVAL);
                }, 3000); // 3-second delay to ensure media is fully ready.

            } catch (err) {
                if (isComponentMounted) {
                    setStatusTitle('Proctoring Error');
                    setStatusMessage("Could not access camera/microphone. Please allow permissions and refresh.");
                }
                console.error("Proctoring initialization failed:", err);
            }
        };

        initializeProctoring(); // Call the initialization function.

        // Cleanup function for useEffect: runs on unmount or when `hasStarted` becomes false.
        return () => {
            isComponentMounted = false; // Set flag to false.
            stopAllMonitoring(); // Stop all intervals.
            if (socketRef.current) socketRef.current.disconnect(); // Disconnect Socket.IO.
            if (localStream) localStream.getTracks().forEach(track => track.stop()); // Stop all media tracks.
            clearMediaStream(); // Clear stream from Zustand store.
        };
    }, [hasStarted, assessmentId, setMediaStream, clearMediaStream, performComprehensiveCheck, logProctoringEvent]); // Dependencies for this effect.

    /**
     * Callback function for when the user exits fullscreen mode.
     * Logs a violation if the exam is active and not already terminating.
     * Uses useCallback for memoization.
     */
    const handleExitFullscreen = useCallback(() => {
        if (hasStarted && !isTerminatingRef.current) {
            // Log as a violation when exiting fullscreen mode during an active exam.
            logProctoringEvent({ type: 'Exited fullscreen mode', severity: 'violation' });
        }
    }, [hasStarted, logProctoringEvent]); // Dependencies: hasStarted, logProctoringEvent.

    // Custom hook `useExamSecurity` to listen for various prohibited actions (e.g., shortcuts, context menus).
    useExamSecurity(logProctoringEvent, hasStarted);

    // Custom hook `useFullscreen` for managing browser fullscreen state.
    const { isFullscreen, requestFullscreen, exitFullscreen } = useFullscreen(handleExitFullscreen);

    /**
     * Debounced function to save student's progress (answered questions) to the backend.
     * Prevents excessive API calls by delaying execution until activity has ceased for a short period.
     * @param {Array<object>} answersToSave - The array of answered questions to send.
     */
    const debouncedSaveProgress = useCallback(debounce(async (answersToSave) => {
        try {
            await axios.post(`${API_BASE_URL}/assessments/${assessmentId}/save-progress`, { answeredquestions: answersToSave }, { headers: { 'Authorization': `Bearer ${sessionStorage.getItem("token")}` } });
        } catch (error) { console.error("Failed to save progress:", error); }
    }, 1500), [assessmentId]); // Dependency: assessmentId.

    /**
     * Handles the submission of the assessment, either manually or automatically (e.g., time's up).
     * Signals termination, exits fullscreen, sends answers and violations to the backend.
     * @param {boolean} [isAutoSubmit=false] - True if this is an automatic submission.
     */
    const handleSubmit = useCallback(async (isAutoSubmit = false) => {
        if (isSubmitting) return; // Prevent multiple submission attempts.

        isTerminatingRef.current = true; // Signal that the exam is terminating to halt further proctoring.

        // If currently in fullscreen, exit it gracefully.
        if (isFullscreen) {
            exitFullscreen();
        }

        setIsSubmitting(true); // Set submission state.
        if (!isAutoSubmit) setShowConfirmModal(false); // Close confirmation modal if not auto-submitting.

        try {
            // Prepare payload for submission: answers and proctoring data.
            const payload = {
                answers: questions.map((q, i) => ({ questionId: q.id, selectedAnswer: answeredQuestions[i] })),
                violations: violations,
                violationCount: violationCount
            };
            // Send submission request to the backend.
            const response = await axios.post(`${API_BASE_URL}/assessments/${assessmentId}/submit`, payload, { headers: { 'Authorization': `Bearer ${sessionStorage.getItem("token")}` } });

            sessionStorage.removeItem(`examStart_${assessmentId}`); // Clear exam start time from session storage.

            // Set final status message for the user.
            setStatusTitle('Assessment Submitted');
            setStatusMessage(response.data.message);

            setQuestions([]); // Clear questions to prevent further interaction.
        } catch (error) {
            setStatusTitle('Submission Error');
            setStatusMessage('Failed to submit assessment. Please try again.');
            setIsSubmitting(false); // Re-enable submission on error.
        }
    }, [
        assessmentId,
        questions,
        answeredQuestions,
        violations,
        violationCount,
        isSubmitting,
        isFullscreen,
        exitFullscreen
    ]); // Dependencies: all states/functions used within this callback.

    /**
     * Handles student's option selection for a question.
     * Updates local state and triggers debounced progress saving.
     * @param {number} qIndex - Global index of the question.
     * @param {string} option - The selected option.
     */
    const handleOptionChange = (qIndex, option) => {
        const newAnswers = [...answeredQuestions];
        newAnswers[qIndex] = option;
        setAnsweredQuestions(newAnswers);
        // Trigger debounced save progress with the updated answers.
        debouncedSaveProgress(questions.map((q, i) => ({ questionId: q.id, selectedOption: newAnswers[i] })));
    };

    /**
     * Initiates the assessment start sequence.
     * Checks for open developer tools, requests fullscreen, and sets `hasStarted` flag.
     */
    const startAssessment = () => {
        // Check if developer tools are open and warn the user.
        if (areDevToolsOpen()) {
            setShowDevToolsWarning(true);
            return; // Prevent assessment from starting.
        }

        setShowDevToolsWarning(false); // Clear any previous warning.
        requestFullscreen(); // Request fullscreen mode.
        setHasStarted(true); // Mark assessment as started.
    };

    /**
     * Handles navigation to a specific question number.
     * Adjusts the current page and scrolls to the question if necessary.
     * @param {number} index - The global index of the question to navigate to.
     */
    const handleQuestionClick = (index) => {
        const newPage = Math.floor(index / questionsPerPage);
        setCurrentPage(newPage);
        // Scroll to the question after page transition, with a slight delay.
        setTimeout(() => { document.getElementById(`question-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
    };

    /**
     * Effect hook to fetch initial assessment questions and student's saved progress.
     * Runs once on component mount.
     */
    useEffect(() => {
        const fetchPageData = async () => {
            const token = sessionStorage.getItem("token");
            if (!token) {
                navigate('/login'); // Redirect if not authenticated.
                return;
            }
            try {
                // Fetch assessment questions and saved answers.
                const { data } = await axios.get(`${API_BASE_URL}/assessments/${assessmentId}/page-data`, { headers: { 'Authorization': `Bearer ${token}` } });
                // Handle assessment status (not opened, closed) that prevents taking the exam.
                if (data.status === 'not_opened' || data.status === 'closed') {
                    setStatusTitle('Assessment Unavailable');
                    setStatusMessage(`This assessment is currently ${data.status}.`);
                } else {
                    setQuestions(data.questions);
                    setExamDurationMinutes(data.assessment.examDurationMinutes);

                    // Restore or set exam start time from session storage.
                    const storedStartTime = sessionStorage.getItem(`examStart_${assessmentId}`);
                    const newStartTime = storedStartTime ? new Date(storedStartTime) : new Date();
                    if (!storedStartTime) sessionStorage.setItem(`examStart_${assessmentId}`, newStartTime.toISOString());
                    setExamStartTime(newStartTime);

                    // Populate answered questions from saved progress.
                    const answersMap = new Map(data.savedAnswers.map(a => [a.questionId, a.selectedOption]));
                    setAnsweredQuestions(data.questions.map(q => answersMap.get(q.id) || null));
                }
            } catch (err) {
                setStatusTitle('Loading Failed');
                setStatusMessage(err.response?.data?.message || 'Failed to load assessment.');
            } finally {
                setIsLoading(false); // Loading complete.
            }
        };
        fetchPageData();
    }, [assessmentId, navigate]); // Dependencies: assessmentId, navigate.

    /**
     * Effect hook for the countdown timer.
     * Triggers auto-submission when time runs out.
     */
    useEffect(() => {
        // Only run if assessment has started, not submitting, exam duration/start time are set, and not already terminating.
        if (!hasStarted || !examDurationMinutes || isSubmitting || !examStartTime || isTerminatingRef.current) return;

        // Calculate exam end time.
        const examEndTime = new Date(examStartTime.getTime() + examDurationMinutes * 60000);
        const timer = setInterval(() => {
            const remaining = Math.max(0, examEndTime - new Date()); // Calculate remaining time, ensure it's not negative.
            setRemainingTime(remaining);
            if (remaining <= 0 && !isSubmitting) {
                clearInterval(timer); // Stop timer.
                setStatusTitle("Time's Up!");
                setStatusMessage("Time has run out. Your assessment will be submitted automatically.");
            }
        }, 1000); // Update every second.
        return () => clearInterval(timer); // Cleanup timer on component unmount or dependencies change.
    }, [examStartTime, examDurationMinutes, isSubmitting, hasStarted]); // Dependencies for this effect.

    /**
     * Effect hook to trigger auto-submission if maximum violations reached or time runs out.
     */
    useEffect(() => {
        if (hasStarted && !isSubmitting && (violationCount >= MAX_VIOLATIONS || statusMessage.startsWith("Time has run out"))) {
            handleSubmit(true); // Trigger auto-submission.
        }
    }, [statusMessage, violationCount, hasStarted, isSubmitting, handleSubmit]); // Dependencies.

    // Display global loading spinner while initial data is being loaded.
    if (isLoading) return <Loader />;

    /** Decodes HTML entities in a given text. */
    const decodeHtmlEntities = (text) => he.decode(text || '');

    /** Formats milliseconds into HH:MM:SS string. */
    const formatTime = (ms) => {
        const totalSeconds = Math.floor(ms / 1000);
        const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
        const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
        const s = String(totalSeconds % 60).padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    // If a final status message is set (e.g., assessment ended, error), display the status screen.
    // Excludes "Could not access camera/microphone" which is handled differently.
    if (statusMessage && !statusMessage.startsWith("Could not access")) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4 bg-slate-100 dark:bg-gray-900">
                <div className='space-y-4 text-center'>
                    <div className="p-8 bg-white dark:bg-gray-800 rounded-lg border-2 border-slate-200 dark:border-gray-700 shadow-lg flex flex-col justify-center items-center">
                        <h3 className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider mb-4">{statusTitle}</h3>
                        <p className="mb-6 text-slate-700 dark:text-gray-200">{statusMessage}</p>
                        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm font-semibold text-white bg-blue-600 px-4 py-2 rounded-lg transition hover:bg-blue-700 dark:hover:bg-blue-500">
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // If assessment has not started yet, display the "Ready to Begin" screen.
    if (!hasStarted) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-gray-900 p-4">
                <div className="w-full max-w-lg text-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">Ready to Begin?</h2>
                    <p className="text-slate-600 dark:text-gray-300 mb-6">This assessment requires fullscreen mode and will monitor your activity to ensure integrity.</p>
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 mb-6">
                        <div className="flex items-center justify-center gap-2 text-amber-700 dark:text-amber-400 mb-2"><AlertTriangle size={18} /> <span className="font-semibold">Monitoring Notice</span></div>
                        <p className="text-sm text-amber-600 dark:text-amber-300">Your camera and microphone will be used. Ensure you're in a quiet, well-lit environment.</p>
                    </div>
                    {showDevToolsWarning && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-6 animate-pulse">
                            <div className="flex items-center justify-center gap-2 text-red-700 dark:text-red-400 mb-2"><ShieldX size={18} /> <span className="font-semibold">Action Required</span></div>
                            <p className="text-sm text-red-600 dark:text-red-300">Please close the browser's developer tools before starting the assessment.</p>
                        </div>
                    )}
                    <button onClick={startAssessment} className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors">
                        <PlayCircle size={18} /> Start Assessment
                    </button>
                </div>
            </div>
        );
    }

    // Calculate total pages and current questions to display based on pagination.
    const totalPages = Math.ceil(questions.length / questionsPerPage);
    const currentQuestions = questions.slice(currentPage * questionsPerPage, (currentPage + 1) * questionsPerPage);

    return (
        <div className="relative flex flex-col lg:flex-row gap-6 p-4 md:p-6 bg-slate-50 dark:bg-gray-900 min-h-screen">

            {/* Fullscreen Required Overlay - Displayed if not in fullscreen after starting */}
            {!isFullscreen && hasStarted && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="w-full max-w-lg text-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
                        <MonitorX className="mx-auto w-16 h-16 text-amber-500 dark:text-amber-400 mb-4" />
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Fullscreen Required</h2>
                        <p className="mt-2 text-slate-600 dark:text-gray-300">For a secure experience, this test must be taken in fullscreen mode.</p>
                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                            <p className="text-sm font-semibold text-red-600 dark:text-red-300">Violations detected: {violationCount} / {MAX_VIOLATIONS}</p>
                            <p className="text-xs text-red-500 dark:text-red-400 mt-1">Please re-enter fullscreen to continue.</p>
                        </div>
                        <button onClick={requestFullscreen} className="mt-6 inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors">
                            <PlayCircle size={18} /> Re-enter Fullscreen
                        </button>
                    </div>
                </div>
            )}

            {/* Main Questions Panel */}
            <div className="w-full lg:w-2/3">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm">
                    <div className="p-5 md:p-6">
                        {currentQuestions?.map((question, index) => {
                            const globalIndex = currentPage * questionsPerPage + index;
                            return (
                                <div className="pb-6 mb-6 border-b border-slate-200 dark:border-gray-700 last:border-b-0 last:mb-0" key={globalIndex} id={`question-${globalIndex}`}>
                                    <h4 className="font-semibold text-slate-800 dark:text-white mb-2">Question {globalIndex + 1}</h4>
                                    <p className="text-slate-700 dark:text-gray-200 mb-3">{decodeHtmlEntities(question?.question)}</p>
                                    <p className="inline-block bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 text-xs font-medium px-2 py-1 rounded-md mb-4">Marks: {question?.mark}</p>
                                    <div className="space-y-3">
                                        {question?.options?.map((option, optIndex) => (
                                            <label key={optIndex} className="flex items-center p-3 border border-slate-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700/50 has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-900 has-[:checked]:border-blue-400 dark:has-[:checked]:border-blue-500">
                                                <input type="radio" name={`q-${globalIndex}`} value={option} checked={answeredQuestions[globalIndex] === option} onChange={() => handleOptionChange(globalIndex, option)} className="w-4 h-4 mr-3 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-500 bg-white dark:bg-gray-700"/>
                                                <span className="text-slate-700 dark:text-gray-200">{decodeHtmlEntities(option)}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {/* Pagination Controls */}
                    <div className="flex justify-between items-center p-4 border-t border-slate-200 dark:border-gray-700">
                        <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 0} className="px-4 py-2 text-sm font-semibold bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-gray-200 rounded-md hover:bg-slate-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                            <ArrowLeft size={16} />Previous
                        </button>
                        <span className="text-sm text-slate-500 dark:text-gray-400">Page {currentPage + 1} of {totalPages}</span>
                        <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages - 1} className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                            Next<ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
            {/* Sidebar / Monitoring Panel */}
            <div className="w-full lg:w-1/3">
                <div className="lg:sticky lg:top-6 space-y-6">
                    {/* Timer Card */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm text-center">
                        <div className={`flex items-center justify-center gap-2 mb-2 ${remainingTime <= 300000 ? 'text-red-500 dark:text-red-400' : 'text-slate-600 dark:text-gray-300'}`}>
                            <Timer size={18} />
                            <span className="text-xl font-medium">{formatTime(remainingTime)}</span>
                        </div>
                        {remainingTime <= 300000 && remainingTime > 0 && (<p className="text-xs text-red-500 dark:text-red-400">Less than 5 minutes remaining!</p>)}
                    </div>
                    {/* Monitoring Status Card */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm">
                        <h4 className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider pb-3 mb-4 border-b border-slate-200 dark:border-gray-700">Monitoring Status</h4>
                        <div className="space-y-3 text-slate-700 dark:text-gray-200">
                            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Camera size={16} /><span className="text-sm">Camera</span></div><span className={`text-xs font-semibold px-2 py-1 rounded-full ${cameraStatus === 'Connected' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'}`}>{cameraStatus}</span></div>
                            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Mic size={16} /><span className="text-sm">Microphone</span></div><span className={`text-xs font-semibold px-2 py-1 rounded-full ${micStatus === 'Connected' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'}`}>{micStatus}</span></div>
                            <div className="flex items-center justify-between"><span className="text-sm">Status</span><span className={`text-xs font-semibold px-2 py-1 rounded-full ${monitoringStatus === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'}`}>{monitoringStatus}</span></div>
                        </div>
                        <div className="mt-4 rounded-lg overflow-hidden border border-slate-300 dark:border-gray-600">
                            <div className="bg-[#0f172a] aspect-video relative">
                                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform -scale-x-100" />
                                {!videoReady && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-800 dark:bg-gray-950 text-white">
                                        <div className="text-center">
                                            <Camera size={24} className="mx-auto mb-2 opacity-50 animate-pulse" />
                                            <p className="text-sm opacity-75">Initializing camera...</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Warnings Display */}
                    {warnings.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-amber-200 dark:border-amber-700 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertTriangle size={16} className="text-amber-500 dark:text-amber-400" />
                                <h4 className="text-xs font-semibold text-amber-500 dark:text-amber-400 uppercase tracking-wider">Warnings</h4>
                            </div>
                            <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                                {warnings.slice().reverse().map((warning, index) => (
                                    <div key={index} className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                                        {warning}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Violations Display */}
                    {violationCount > 0 && (
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-red-200 dark:border-red-700 shadow-sm">
                            <div className="flex items-center gap-2 mb-3"><AlertTriangle size={16} className="text-red-500 dark:text-red-400" /><h4 className="text-xs font-semibold text-red-500 dark:text-red-400 uppercase tracking-wider">Violations ({violationCount}/{MAX_VIOLATIONS})</h4></div>
                            <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                                {violations.slice().reverse().map((violation, index) => (<div key={index} className="text-xs text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/20 p-2 rounded">{violation}</div>))}
                            </div>
                            {violationCount >= MAX_VIOLATIONS - 1 && (<div className="mt-3 p-2 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg"><p className="text-xs text-red-700 dark:text-red-300 font-semibold">Warning: Next violation will auto-submit!</p></div>)}
                        </div>
                    )}

                    {/* Question Navigation & Submit */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm">
                        <h4 className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider pb-3 mb-4 border-b border-slate-200 dark:border-gray-700">Question Navigation</h4>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {questions.map((_, index) => (
                                <button key={index} onClick={() => handleQuestionClick(index)} className={`w-9 h-9 flex items-center justify-center rounded-md text-sm font-medium transition-colors
                                    ${answeredQuestions[index] ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-gray-700 text-slate-600 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-gray-600'}`
                                }>{index + 1}</button>
                            ))}
                        </div>
                        <div className="mb-4 p-3 bg-slate-50 dark:bg-gray-700 rounded-lg">
                            <div className="flex justify-between text-sm text-slate-700 dark:text-gray-200">
                                <span>Answered:</span>
                                <span className="font-semibold">{answeredQuestions.filter(a => a !== null).length} / {questions.length}</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-gray-600 rounded-full h-2 mt-2">
                                <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${(answeredQuestions.filter(a => a !== null).length / questions.length) * 100}%` }} />
                            </div>
                        </div>
                        <button onClick={() => setShowConfirmModal(true)} disabled={isSubmitting} className="w-full px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-500 disabled:bg-red-300 dark:disabled:bg-gray-600 flex items-center justify-center gap-2">{isSubmitting ? 'Submitting...' : 'End Assessment'}</button>
                    </div>
                </div>
            </div>
            {/* Submission Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black/50 dark:bg-gray-950/70 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
                        <h3 id="confirm-modal-title" className="text-lg font-semibold text-slate-800 dark:text-white mb-2">Submit Assessment?</h3>
                        <p className="text-sm text-slate-600 dark:text-gray-300 mb-4">Are you sure you want to end your assessment? This cannot be undone.</p>
                        <div className="bg-slate-50 dark:bg-gray-700 p-4 rounded-lg mb-4 space-y-2 text-sm text-slate-700 dark:text-gray-200">
                            <div className="flex justify-between"><span>Answered:</span><span className="font-semibold">{answeredQuestions.filter(a => a !== null).length} / {questions.length}</span></div>
                            <div className="flex justify-between"><span>Violations:</span><span className={`font-semibold ${violationCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{violationCount}</span></div>
                            <div className="flex justify-between"><span>Time Remaining:</span><span className="font-semibold">{formatTime(remainingTime)}</span></div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowConfirmModal(false)} disabled={isSubmitting} className="px-4 py-2 text-sm font-semibold bg-slate-200 dark:bg-gray-600 text-slate-700 dark:text-gray-200 rounded-md hover:bg-slate-300 dark:hover:bg-gray-500 disabled:opacity-50">Cancel</button>
                            <button onClick={() => handleSubmit()} disabled={isSubmitting} className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-500 disabled:opacity-50">{isSubmitting ? 'Submitting...' : 'Yes, Submit'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssessmentPage;
