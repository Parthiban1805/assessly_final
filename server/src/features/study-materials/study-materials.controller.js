const studyMaterialService = require('./study-materials.service');

const addStudyMaterial = async (req, res) => {
    try {
        // The file is available on req.file thanks to the upload middleware
        // The form fields are on req.body
        const savedMaterial = await studyMaterialService.createStudyMaterial(req.body, req.file);

        res.status(201).json({
            message: 'Study material added successfully.',
            data: savedMaterial,
        });
    } catch (error) {
        console.error('Error adding study material:', error);
        res.status(500).json({ message: error.message || 'Internal Server Error.' });
    }
};

module.exports = { addStudyMaterial };