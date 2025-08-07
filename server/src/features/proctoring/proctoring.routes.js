const express = require('express');
const router = express.Router();
const controller = require('./proctoring.controller');
const { verifyToken, isStudent, authorize, isAdmin } = require('../../middlewares/auth.middleware');
// Make sure to import the correctly structured middleware
const { uploadImage, uploadAudio, uploadCheckFiles, uploadVideo } = require('../../middlewares/upload.middleware');

// --- Identity Verification Routes ---

// This route is for the initial face verification step from VerificationPage.js
// It expects MULTIPLE files under the SAME field name: 'livePhotos'
// Therefore, it MUST use the .array() method.
router.post(
    '/verify-face', 
    verifyToken, 
    isStudent,
    uploadImage.array('livePhotos', 15), // CORRECT: Using .array() for multiple files
    controller.verifyFace
);

// This route expects a SINGLE audio file with the field name 'voiceSample'
router.post(
    '/enroll-voice', 
    verifyToken, 
    isStudent, 
    uploadAudio.single('voiceSample'), // CORRECT: Using .single() for one file
    controller.enrollVoice
);

router.post(
    '/enroll-face',
    verifyToken,
    isStudent,
    uploadImage.single('enrollmentPhoto'), // Use .single() for one file
    controller.enrollFace
);


router.post(
    '/admin/enroll-face-for-student', // New endpoint for admins
    verifyToken,
    isAdmin, // Only allow admin role to access this
    uploadImage.single('enrollmentPhoto'), // Expects a single photo file
    controller.adminEnrollStudentFace // New controller function
);
// --- Proctoring Routes During Assessment ---

// This route is for the legacy audio analysis (if needed)
router.post(
    '/analyze-audio', 
    verifyToken, 
    isStudent, 
    uploadAudio.single('audioChunk'),
    controller.analyzeAudio
);

// This is the old combined check. It expects MULTIPLE field names.
// Therefore, it MUST use the uploadCheckFiles middleware which is configured with .fields()
router.post(
    '/perform-check', 
    verifyToken, 
    isStudent, 
    uploadCheckFiles, // CORRECT: Using the pre-configured .fields() middleware
    controller.performCheck
);

// This is the NEW all-in-one check from AssessmentPage.js
// It expects a SINGLE image file with the field name 'frame'
router.post(
    '/comprehensive-check',
    verifyToken,
    isStudent,
    uploadImage.single('frame'), // CORRECT: Using .single() for one file
    controller.performComprehensiveCheck
);


module.exports = router;