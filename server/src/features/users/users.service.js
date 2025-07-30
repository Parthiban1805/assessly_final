const { Student, Teacher } = require('./users.model');
// For the academic summary calculation, we need these models too.
const { Subject } = require('../subjects/subjects.model');
const { Marks } = require('../grades/grades.model');
const bcrypt = require('bcryptjs'); // Make sure you have `npm install bcryptjs`


const hashPassword = (password) => {
    if (!password) throw new Error("Password is required.");
    return bcrypt.hash(password, 10);
};
/**
 * Searches for a student by a partial or full name.
 * Uses a regex for flexible, case-insensitive matching.
 * @param {string} nameQuery - The name to search for (e.g., "nikhita").
 * @returns {Promise<Array>} A promise that resolves to an array of matching student objects.
 */
const searchStudentsByName = async (nameQuery) => {
    // Using a regex for a "contains" search, case-insensitive
    const students = await Student.find(
        { name: { $regex: new RegExp(nameQuery, 'i') } },
        'student_id name department' // Only return essential fields
    ).lean();
    return students;
};


/**
 * Creates a new student with a hashed password.
 * @param {object} studentData - The student details from the chatbot.
 * @returns {Promise<object>} The newly created student document.
 */
const createStudent = async (studentData) => {
    const { email, student_id } = studentData;

    // Check for existing user
    const existingStudent = await Student.findOne({ $or: [{ email }, { student_id }] });
    if (existingStudent) {
        throw new Error('A student with this email or ID already exists.');
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(studentData.password, 10);

    const newStudent = new Student({
        ...studentData,
        password: hashedPassword,
        role: 'student' // Ensure role is set
    });
    
    return await newStudent.save();
};

// --- Reusable Academic Summary Calculation (THE FIX) ---
// This function is now more robust and correctly calculates attendance.
const calculateStudentAcademicSummary = async (studentId, department, year) => {
    try {
        const numericYear = parseInt(String(year).match(/\d+/)[0]) || year;
        
        // 1. Get all subjects and their associated assessments for the student's context.
        const subjects = await Subject.find({ department, year: numericYear }).populate('assessments', '_id').lean();
        if (!subjects.length) return [];

        // 2. Get the student's marks document.
        const studentMarksDoc = await Marks.findOne({ studentId }).lean();
        
        // 3. Create a Map for efficient lookup of a student's assessment records.
        // This map stores assessment IDs as keys and their mark/status data as values.
        const studentMarksMap = new Map();
        if (studentMarksDoc && studentMarksDoc.assessments) {
            studentMarksDoc.assessments.forEach(a => {
                if(a.assessmentId) { // Ensure assessmentId is not null
                    studentMarksMap.set(a.assessmentId.toString(), {
                        marks: a.marks,
                        statuses: a.statuses
                    });
                }
            });
        }

        // 4. Iterate through each subject to calculate stats.
        return subjects.map(subject => {
            let attendedAssessments = 0;
            let totalMarks = 0;

            if (subject.assessments) {
                subject.assessments.forEach(assessment => {
                    const assessmentIdStr = assessment._id.toString();
                    
                    // If the student's marks map has a record for this assessment, it was attended.
                    if (studentMarksMap.has(assessmentIdStr)) {
                        attendedAssessments++;
                        totalMarks += studentMarksMap.get(assessmentIdStr).marks || 0;
                    }
                });
            }

            return {
                name: subject.name,
                totalAssessments: subject.assessments?.length || 0,
                attendedAssessments, // Use the correct, consistent name
                totalMarks,
            };
        });
    } catch (error) {
        console.error(`Error calculating academic summary for ${studentId}:`, error);
        throw new Error('Failed to calculate academic summary.');
    }
};

// --- Core User Services ---

const getStudentDetails = async (studentId) => {
    const personalDetails = await Student.findOne({ student_id: studentId }).lean();
    if (!personalDetails) {
        const err = new Error('Student not found.');
        err.statusCode = 404;
        throw err;
    }
    const academicSummary = await calculateStudentAcademicSummary(
        personalDetails.student_id,
        personalDetails.department,
        personalDetails.year
    );
    return { ...personalDetails, subjects: academicSummary };
};

const getTeacherDetails = async (teacherId) => {
    const teacher = await Teacher.findOne({ teacher_id: teacherId }).lean();
    if (!teacher) {
        const err = new Error('Teacher not found.');
        err.statusCode = 404;
        throw err;
    }
    return teacher;
};

const updateStudentClub = async (studentId, club) => {
    if (!club) throw new Error('Club selection is required.');
    const student = await Student.findOneAndUpdate({ student_id: studentId }, { club }, { new: true });
    if (!student) throw new Error('Student not found.');
    return student;
};

const updateStudent = async (mongoId, updateData) => {
    // If a new password is provided, hash it. Otherwise, remove it from the update object.
    if (updateData.password) {
        updateData.password = await hashPassword(updateData.password);
    } else {
        delete updateData.password;
    }
    
    const student = await Student.findByIdAndUpdate(mongoId, updateData, { new: true }).select('-password');
    if (!student) throw new Error('Student not found for update.');
    return student;
};

const deleteStudent = async (studentId) => {
    const result = await Student.findOneAndDelete({ student_id: studentId });

    if (!result) {
        throw new Error('Student not found for deletion.');
    }

    return { message: 'Student deleted successfully.' };
};

// --- Teacher Services ---

const createTeacher = async (teacherData) => {
    const { email, teacher_id } = teacherData;
    const existing = await Teacher.findOne({ $or: [{ email }, { teacher_id }] });
    if (existing) throw new Error('A teacher with this email or ID already exists.');

    teacherData.password = await hashPassword(teacherData.password);
    teacherData.role = 'teacher'; // Force role
    return await new Teacher(teacherData).save();
};

const searchTeachersByName = async (nameQuery) => {
    return Teacher.find(
        { name: { $regex: new RegExp(nameQuery, 'i') } },
        'teacher_id name department'
    ).lean();
};



const updateTeacher = async (mongoId, updateData) => {
    if (updateData.password) {
        updateData.password = await hashPassword(updateData.password);
    } else {
        delete updateData.password;
    }
    const teacher = await Teacher.findByIdAndUpdate(mongoId, updateData, { new: true }).select('-password');
    if (!teacher) throw new Error('Teacher not found for update.');
    return teacher;
};

const deleteTeacher = async (mongoId) => {
    const result = await Teacher.findByIdAndDelete(mongoId);
    if (!result) throw new Error('Teacher not found for deletion.');
    return { message: 'Teacher deleted successfully.' };
};

/**
 * CATEGORY 2: Forces a password reset for a user.
 * @param {string} userId - The unique ID of the user (student_id or teacher_id).
 * @param {'student' | 'teacher'} userType - The type of user.
 * @param {string} newPassword - The new temporary password.
 * @returns {Promise<object>} A success message.
 */
const forcePasswordReset = async (userId, userType, newPassword) => {
    if (!newPassword || newPassword.length < 6) {
        throw new Error("The new temporary password must be at least 6 characters long.");
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    let user;
    if (userType === 'student') {
        user = await Student.findOneAndUpdate({ student_id: userId }, { password: hashedPassword });
    } else if (userType === 'teacher') {
        user = await Teacher.findOneAndUpdate({ teacher_id: userId }, { password: hashedPassword });
    } else {
        throw new Error("Invalid user type specified.");
    }

    if (!user) {
        throw new Error(`User with ID ${userId} not found.`);
    }

    return { message: `Password for ${userType} ${userId} has been successfully reset.` };
};

// **THE FIX:** Export all functions in a single, consistent object.
module.exports = {
    getStudentDetails,
    getTeacherDetails,
    updateStudentClub,
    updateStudent,
    deleteStudent,
    searchStudentsByName, 
    createStudent,      
    searchTeachersByName,
    createTeacher, // Add createTeacher export
    updateTeacher,
    deleteTeacher,
    forcePasswordReset
};