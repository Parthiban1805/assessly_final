const uploadService = require('./add_user.service');

const bulkCreateUsers = async (req, res) => {
    try {
        const { userType } = req.params; // Get userType from the URL parameter
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'No file was uploaded.' });
        }

        const result = await uploadService.processUserUpload(file.buffer, userType);
        
        res.status(201).json(result);

    } catch (error) {
        console.error('Error processing user upload:', error);
        res.status(500).json({ message: error.message || 'An error occurred during file processing.' });
    }
};

module.exports = { bulkCreateUsers };