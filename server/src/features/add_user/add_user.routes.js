const express = require('express');
const router = express.Router();
const { bulkCreateUsers } = require('./add_user.controller');
const { verifyToken, isAdmin } = require('../../middlewares/auth.middleware');
const { uploadDocument } = require('../../middlewares/upload.middleware');

// A single, dynamic route for bulk user creation.
// The ':userType' parameter will be either 'student' or 'teacher'.
// e.g., POST /api/v1/uploads/users/student
// e.g., POST /api/v1/uploads/users/teacher
router.post(
    '/users/:userType',
    verifyToken,
    isAdmin,
    uploadDocument.single('file'), // Use the correct middleware here
    bulkCreateUsers
);

module.exports = router;