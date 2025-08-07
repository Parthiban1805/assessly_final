const express = require('express');
const router = express.Router();
const { getTeacherProfile } = require('./teachers.controller');
const { verifyToken, isTeacher } = require('../../middlewares/auth.middleware');

// GET /api/v1/teachers/profile -> to get the logged-in teacher's details
router.get('/profile', verifyToken, isTeacher, getTeacherProfile);

module.exports = router;