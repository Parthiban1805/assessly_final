const express = require('express');
const router = express.Router();
const { addStudyMaterial,getStudentStudyMaterials } = require('./study-materials.controller');
const { verifyToken, isTeacher,isStudent } = require('../../middlewares/auth.middleware');
const { uploadDocument } = require('../../middlewares/upload.middleware');

// This route is protected, only for teachers, and handles a single file upload
router.post(
    '/', 
    verifyToken, 
    isTeacher, 
    uploadDocument.single('file'), // Use the correct middleware here
    addStudyMaterial
);
router.get(
    '/my-materials',
    verifyToken,
    isStudent, // Ensures only users with the 'student' role can access this
    getStudentStudyMaterials
);

module.exports = router;