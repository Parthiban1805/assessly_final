// File: src/features/dashboard/dashboard.routes.js
const express = require('express');
const router = express.Router();
const { getStudentDashboard } = require('./dashboard.controller');
const { verifyToken, isStudent } = require('../../middlewares/auth.middleware');

// Define the single endpoint for the student dashboard.
// The middlewares run in order: verify token, check role, then run controller.
router.get('/student', verifyToken, isStudent, getStudentDashboard);

module.exports = router;