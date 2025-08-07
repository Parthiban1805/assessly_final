const xlsx = require('xlsx');
const bcrypt = require('bcrypt');
const { Student, Teacher } = require('../users/users.model');

const SALT_ROUNDS = 10;

/**
 * Parses user data from a file buffer and creates user documents.
 * @param {Buffer} fileBuffer - The buffer from the uploaded file.
 * @param {string} userType - The type of user to create ('student' or 'teacher').
 * @returns {Promise<object>} An object with a success message and count.
 */
const processUserUpload = async (fileBuffer, userType) => {
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!sheetData || sheetData.length === 0) {
        throw new Error('The uploaded file is empty or invalid.');
    }

    let createdCount = 0;

    if (userType === 'student') {
        const studentsToCreate = await Promise.all(
            sheetData.map(async (row) => {
                if (!row.password || !row.email || !row.name || !row.student_id) {
                    // Skip rows with missing essential data
                    console.warn(`Skipping row due to missing data: ${JSON.stringify(row)}`);
                    return null;
                }
                const hashedPassword = await bcrypt.hash(String(row.password), SALT_ROUNDS);
                return {
                    name: row.name,
                    email: row.email,
                    password: hashedPassword,
                    student_id: row.student_id,
                    semester: row.semester,
                    year: row.year,
                    boarding: row.boarding,
                    class_advisor: row.class_advisor,
                    department: row.department,
                    photo_url: row.photo_url || null,
                    phone: row.phone,
                    role: 'student',
                };
            })
        );
        
        const validStudents = studentsToCreate.filter(Boolean); // Remove null entries
        if (validStudents.length > 0) {
            await Student.insertMany(validStudents, { ordered: false });
        }
        createdCount = validStudents.length;

    } else if (userType === 'teacher') {
        const teachersToCreate = await Promise.all(
            sheetData.map(async (row) => {
                if (!row.password || !row.email || !row.name || !row.teacher_id) {
                    console.warn(`Skipping row due to missing data: ${JSON.stringify(row)}`);
                    return null;
                }
                const hashedPassword = await bcrypt.hash(String(row.password), SALT_ROUNDS);
                return {
                    name: row.name,
                    email: row.email,
                    password: hashedPassword,
                    teacher_id: row.teacher_id,
                    department: row.department,
                    subjects: row.subjects, // Expects a comma-separated string
                    photo_url: row.photo_url || null,
                    role: 'teacher',
                };
            })
        );
        
        const validTeachers = teachersToCreate.filter(Boolean);
        if (validTeachers.length > 0) {
            await Teacher.insertMany(validTeachers, { ordered: false });
        }
        createdCount = validTeachers.length;

    } else {
        throw new Error('Invalid user type specified for upload.');
    }

    return { message: `Successfully created ${createdCount} new ${userType}(s).` };
};

module.exports = { processUserUpload };