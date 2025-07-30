const StudyMaterial = require('./study-materials.model');
const { uploadFileToDrive } = require('../../services/googleDrive.service');

/**
 * Creates a new study material entry after uploading the file to Google Drive.
 * @param {object} materialData - The form data (teacher_id, subjectName, etc.).
 * @param {object} file - The file object from multer (containing buffer, originalname, etc.).
 * @returns {Promise<object>} The saved study material document.
 */
const createStudyMaterial = async (materialData, file) => {
    if (!file) {
        throw new Error('File upload is required.');
    }
    
    // 1. Upload file to external service (Google Drive)
    const fileLink = await uploadFileToDrive(file.buffer, file);
    
    // 2. Create the document to save in MongoDB
    const newMaterial = new StudyMaterial({
        ...materialData,
        filePath: fileLink,
        fileName: file.originalname,
        year: parseInt(materialData.year, 10),
    });

    // 3. Save the metadata to our database
    return await newMaterial.save();
};

module.exports = { createStudyMaterial };