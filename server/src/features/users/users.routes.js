const express = require('express');
const router = express.Router();
const controller = require('./users.controller');
const { verifyToken, isStudent, isAdmin } = require('../../middlewares/auth.middleware');

// --- UNIFIED ROUTE FOR GETTING USER DETAILS (for Admin) ---
// Matches GET /api/v1/users/12121?type=student
router.get(
    '/:id',
    verifyToken,
    isAdmin,
    controller.getDetails
);

// --- STUDENT-SPECIFIC ACTION ROUTES ---

// Matches PUT /api/v1/users/club/:studentId (for Students)
router.put(
    '/club/:studentId',
    verifyToken,
    isStudent,
    controller.updateClub
);

// --- ADMIN CRUD FOR STUDENTS (NEW & UPDATED) ---
// Matches POST /api/v1/users/students (for Admins)
router.post(
    '/students',
    verifyToken,
    isAdmin,
    controller.createStudent
);

// Matches PUT /api/v1/users/students/:id (for Admins, uses mongo _id)
router.put(
    '/students/:id',
    verifyToken,
    isAdmin,
    controller.updateStudent
);

// Matches DELETE /api/v1/users/students/:id (for Admins, uses mongo _id)
router.delete(
    '/students/:id',
    verifyToken,
    isAdmin,
    controller.deleteStudent
);

// --- ADMIN CRUD FOR TEACHERS (NEW) ---
// Matches POST /api/v1/users/teachers (for Admins)
router.post(
    '/teachers',
    verifyToken,
    isAdmin,
    controller.createTeacher
);

// Matches PUT /api/v1/users/teachers/:id (for Admins, uses mongo _id)
router.put(
    '/teachers/:id',
    verifyToken,
    isAdmin,
    controller.updateTeacher
);

// Matches DELETE /api/v1/users/teachers/:id (for Admins, uses mongo _id)
router.delete(
    '/teachers/:id',
    verifyToken,
    isAdmin,
    controller.deleteTeacher
);


module.exports = router;