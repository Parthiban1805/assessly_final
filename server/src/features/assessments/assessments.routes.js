// File: assessments.router.js

const express = require('express');
const router = express.Router();
const controller = require('./assessments.controller');
const { verifyToken, isStudent, isTeacher, isAdmin } = require('../../middlewares/auth.middleware');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


// ----------------------------------------------------
// 1. LITERAL STRING PATHS (MUST COME FIRST)
//    These paths are specific and should be matched exactly.
// ----------------------------------------------------

// TEACHER ROUTE: GET /api/v1/assessments/my-assessments
router.get('/my-assessments', verifyToken, isTeacher, controller.getMyAssessments);

// ADMIN ROUTE: GET /api/v1/assessments/admin/all
router.get('/admin/all', verifyToken, isAdmin, controller.getAllAssessments);

// TEACHER ROUTE: POST /api/v1/assessments/ (for creating new assessments, a specific action)
router.post('/', verifyToken, isTeacher, upload.single('file'), controller.createAssessment);


// ----------------------------------------------------
// 2. DYNAMIC PATHS (ORDERED FROM MORE SPECIFIC TO GENERAL)
//    These paths contain dynamic parameters like :assessmentId.
// ----------------------------------------------------

// STUDENT ROUTES: More specific dynamic paths (e.g., paths with sub-segments like /handler-data)
router.get('/:assessmentId/handler-data', verifyToken, isStudent, controller.getHandlerPageData);
router.get('/:assessmentId/page-data', verifyToken, isStudent, controller.getAssessmentPageData);

// STUDENT ROUTES: POST actions on dynamic IDs
router.post('/:assessmentId/save-progress', verifyToken, isStudent, controller.saveProgress);
router.post('/:assessmentId/submit', verifyToken, isStudent, controller.handleSubmit);
router.post('/:assessmentId/lock', verifyToken, isStudent, controller.handleLock);


// GENERAL DYNAMIC ID ROUTE: GET /api/v1/assessments/:assessmentId
// This route is the most general dynamic GET route. It should come LAST among GETs
// that use :assessmentId if other, more specific patterns exist.
// This route will now only be hit if the URL segment is NOT 'my-assessments' or 'admin/all'.
router.get(
    '/:assessmentId', // This matches /api/v1/assessments/SOME_ID (where SOME_ID is an actual ObjectId)
    verifyToken,
    // This allows any authenticated user to view assessment details.
    (req, res, next) => {
        if (req.user) {
            next();
        } else {
            return res.status(403).json({ message: 'Forbidden. User not authenticated.' });
        }
    },
    controller.getAssessmentDetailsById
);


// ADMIN ROUTE: DELETE /api/v1/assessments/admin/:id
// This is also a dynamic ID but has a prefix 'admin/', so it can stay
// even if it was above the general :assessmentId, but it's good to keep
// similar general patterns together.
router.delete('/admin/:id', verifyToken, isAdmin, controller.deleteAssessment);


module.exports = router;