// File: routes/analytics.routes.js
const express = require('express');
const router = express.Router();
const { verifyToken, isTeacher } = require('../../middlewares/auth.middleware');
const analyticsController = require('./analytics.controller');

// Assessment Routes
router.get('/assessments', verifyToken, analyticsController.getTeacherAssessments);

// Analytics Summary
router.get('/summary', verifyToken, analyticsController.getAnalyticsSummary); 

// Top Performers
router.get('/top-performers', verifyToken, analyticsController.getTopPerformers);

// Performance Graph
router.get('/performance-graph', verifyToken, analyticsController.getPerformanceGraph);

// Student Performance
router.get('/student-performance', verifyToken, analyticsController.getStudentPerformance);

// Performance Distribution
router.get('/performance-distribution', verifyToken, analyticsController.getPerformanceDistribution);

// Question Performance
router.get('/question-performance', verifyToken, analyticsController.getQuestionPerformance);

router.get('/assessment/:assessmentId/marks', verifyToken, analyticsController.getStudentMarksForAssessment);


module.exports = router;
