const express = require('express');
const router = express.Router();
const { getAllSubjectsForStudent, getSingleSubjectDetails } = require('./subjects.controller');
const { verifyToken, isStudent } = require('../../middlewares/auth.middleware');

// All routes in this file are protected and for students only
router.use(verifyToken, isStudent);

// GET /api/v1/subjects/ -> For the CourseModules page
router.get('/', getAllSubjectsForStudent);

// GET /api/v1/subjects/:id -> For the CourseView page
router.get('/:id', getSingleSubjectDetails);

module.exports = router;