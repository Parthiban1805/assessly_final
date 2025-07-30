const express = require('express');
const router = express.Router();
const feedbackController = require('./feedback.controller');
const { verifyToken, isTeacher, isAdmin, authorize } = require('../../middlewares/auth.middleware'); // Assuming only teachers/admins can request this

// POST /api/v1/feedback - Generate AI feedback
router.post(
    '/',
    verifyToken,
    // You can adjust roles here. If students should also be able to get feedback,
    // you might need a separate endpoint or logic in the controller to determine
    // if the requested studentId matches the token's studentId.
    // For now, assuming teacher/admin access to generate feedback for any student.
    authorize('teacher', 'admin'), 
    feedbackController.generateFeedback
);

module.exports = router;