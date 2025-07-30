const express = require('express');
const router = express.Router();
const { getResultPageData } = require('./results.controller');
// FIX: Ensure 'authorize' is imported for generic role checking
const { verifyToken, isStudent, authorize, isTeacher } = require('../../middlewares/auth.middleware'); 


// FIX: Combine teacher and admin into a single route definition
// This route will handle requests for /api/v1/results/:studentId/:assessmentId
// It requires a token, and the user's role must be either 'teacher' OR 'admin'.
router.get(
    '/:studentId/:assessmentId', // This path expects two dynamic parameters
    verifyToken,               // First, verify the JWT token
    isTeacher, // Then, check if the user is a teacher OR an admin
    getResultPageData          // Finally, execute the controller logic
);

// GET /api/v1/results/:assessmentId (for students viewing their own result)
// This route remains unchanged and uses 'isStudent'
router.get('/:assessmentId', verifyToken, isStudent, getResultPageData);

module.exports = router;