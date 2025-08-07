const proctoringService = require('./proctoring.service');

async function handleRequest(servicePromise, res) {
    try {
        const result = await servicePromise;
        res.status(200).json(result);
    } catch (error) {
        // Log the full error for debugging on the server
        console.error("[CONTROLLER_ERROR]", error); 
        res.status(500).json({ message: error.message || "An unexpected error occurred." });
    }
}

// --- CORRECTED FUNCTION ---
const verifyFace = (req, res) => {
    console.log('[CONTROLLER] /verify-face hit. Checking req.files...');
    
    // When using .array() in multer, req.files IS the array of files.
    // The check should be on req.files and its length.
    if (!req.files || req.files.length === 0) {
        console.error('[CONTROLLER] Validation failed. req.files is empty or not an array.');
        return res.status(400).json({ message: 'No live photo frames were received.' });
    }

    console.log(`[CONTROLLER] Found ${req.files.length} files. Passing the entire req.files array to the service.`);
    
    // THE FIX: Pass the entire req.files array to the service, NOT req.files.livePhotos
    handleRequest(proctoringService.verifyFace(req.user.userDetails.student_id, req.files), res);
};

// --- Other functions remain the same ---
const enrollVoice = (req, res) => handleRequest(proctoringService.enrollVoice(req.user.userDetails.student_id, req.file), res);

const analyzeAudio = (req, res) => handleRequest(proctoringService.analyzeAudio(req.user.userDetails.student_id, req.file), res);

const performCheck = (req, res) => {
    try {
        const { student_id } = req.user.userDetails;
        // This function correctly uses req.files.livePhotos because its route uses .fields()
        if (!req.files || !req.files.livePhotos || req.files.livePhotos.length === 0) {
            return res.status(400).json({ message: 'Live photos are required.' });
        }
        const livePhotos = req.files.livePhotos;
        const audioChunk = (req.files.audioChunk && req.files.audioChunk.length > 0) ? req.files.audioChunk[0] : null;
        handleRequest(proctoringService.performFullCheck(student_id, livePhotos, audioChunk), res);
    } catch (error) {
        console.error("[PERFORM_CHECK_ERROR]", error.message);
        res.status(500).json({ message: "An error occurred during the proctoring check." });
    }
};

const performComprehensiveCheck = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No frame image file was received.' });
    }
    const { student_id } = req.user.userDetails;
    
    // *** THE FIX: Get the flag from the request body ***
    const performVerification = req.body.perform_face_verification === 'true';

    // Pass the file and the flag to the service
    handleRequest(proctoringService.performComprehensiveCheck(student_id, req.file, performVerification), res);
};

const enrollFace = (req, res) => {
    console.log('[CONTROLLER] /enroll-face hit. Processing enrollment...');
    if (!req.file) {
        return res.status(400).json({ message: 'No enrollment photo was received.' });
    }
    const studentId = req.user.userDetails.student_id;
    const role = req.user.role;
    handleRequest(proctoringService.enrollFace(studentId, req.file, role), res);
};

const adminEnrollStudentFace = (req, res) => {
    console.log('[CONTROLLER] /admin/proctoring/enroll-face-for-student hit. Processing enrollment for specific student...');
    if (!req.file) {
        return res.status(400).json({ message: 'No enrollment photo was received.' });
    }
    // For admin enrollment, the target student ID comes from the request body
    const { student_id: targetStudentId } = req.body; 
    if (!targetStudentId) {
        return res.status(400).json({ message: 'Student ID is required for admin enrollment.' });
    }

    const adminRole = req.user.role; // This will be 'admin'
    
    // Call the service with the target student ID and the admin role
    handleRequest(proctoringService.enrollFace(targetStudentId, req.file, adminRole), res);
};


module.exports = { 
    enrollFace,
    verifyFace, 
    enrollVoice, 
    analyzeAudio, 
    performCheck,
    performComprehensiveCheck,
    adminEnrollStudentFace
};