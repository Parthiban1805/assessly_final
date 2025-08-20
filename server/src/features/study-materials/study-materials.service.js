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

const findMaterialsForStudent = async (user) => {
    // FIX #2: Add the new department format to the mapping.
    const departmentMapping = {
        "B.Sc Cyber Security": "Cyber Security",
        "B.Sc IT": "IT",
        "B.Sc CSE": "Computer Science",
        "B.Sc AIML": "AIML",
        "B.Sc AIDS": "AIDS",
        "B.Sc CA": "CA",
        "BSC CS": "Computer Science", // <-- ADD THIS LINE
    };

    // REMOVED: We don't need to extract the year from the email anymore.
    // const extractYearFromEmail = ...

    // The user object here is the `userDetails` object from the token.
    const { department } = user;

    // FIX #1: Get the year directly from the user object.
    // Use parseInt to ensure it's a number for the database query.
    const year = user.year ? parseInt(user.year, 10) : null;

    const normalizedDepartment = departmentMapping[department] || department;

    // This check will now pass.
    if (!year || !normalizedDepartment) {
        throw new Error('Could not determine your year or department from your profile. Please contact administration if you believe this is an error.');
    }

    console.log(`🔍 Searching for materials with Year: ${year}, Department: "${normalizedDepartment}"`);

    const materials = await StudyMaterial.find({
        year: year,
        department: normalizedDepartment,
    }).sort({ uploadedAt: -1 });

    return materials;
};




module.exports = { createStudyMaterial,findMaterialsForStudent };