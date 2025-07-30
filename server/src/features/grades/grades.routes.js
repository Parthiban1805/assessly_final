const express = require('express');
const router = express.Router();
const { getGradesPageData } = require('./grades.controller');
const { verifyToken, isStudent } = require('../../middlewares/auth.middleware');

// Defines the single endpoint to get all data for the Grades page
router.get('/page-data', verifyToken, isStudent, getGradesPageData);

module.exports = router;