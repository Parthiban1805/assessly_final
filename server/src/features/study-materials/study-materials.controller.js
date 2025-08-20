const studyMaterialService = require('./study-materials.service');

const addStudyMaterial = async (req, res) => {
    try {
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


const getStudentStudyMaterials = async (req, res) => {
    try {
        // req.user contains the full token payload { role, userDetails }
        // We only need to pass the userDetails object to the service.
        console.log("Passing these details to the service:", req.user.userDetails); // Add this log to confirm

        // **** THE FIX IS HERE ****
        const materials = await studyMaterialService.findMaterialsForStudent(req.user.userDetails);

        res.status(200).json(materials);
    } catch (error) {
        console.error('Error fetching student study materials:', error);
        if (error.message.includes('Could not determine your year')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
};

module.exports = { addStudyMaterial,getStudentStudyMaterials };