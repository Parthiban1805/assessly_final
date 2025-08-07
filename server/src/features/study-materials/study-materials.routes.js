const express = require('express');
const router = express.Router();
const { addStudyMaterial } = require('./study-materials.controller');
const { verifyToken, isTeacher } = require('../../middlewares/auth.middleware');
const { uploadDocument } = require('../../middlewares/upload.middleware');

// This route is protected, only for teachers, and handles a single file upload
router.post(
    '/', 
    verifyToken, 
    isTeacher, 
    uploadDocument.single('file'), // Use the correct middleware here
    addStudyMaterial
);

module.exports = router;