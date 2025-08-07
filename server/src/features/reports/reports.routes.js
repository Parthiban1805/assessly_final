// File: src/features/reports/reports.routes.js
const express = require('express');
const router = express.Router();
const controller = require('./reports.controller');
const { verifyToken ,isTeacher} = require('../../middlewares/auth.middleware'); // Assuming a generic verifyToken for now

// All routes in this file are protected

// GET /api/v1/reports/subject-performance -> Get report data as JSON
router.get('/student-subjects',verifyToken,isTeacher, controller.getSubjectPerformanceReport);

// GET /api/v1/reports/subject-performance/download -> Download report as Excel
router.get('/download/student-subjects', verifyToken,isTeacher,controller.downloadSubjectPerformanceReport);
router.get('/teacher-date-wise', verifyToken, isTeacher, controller.getTeacherDateWiseReport);
router.post('/chatbot', verifyToken,isTeacher,controller.handleChatbotQuery);


module.exports = router;