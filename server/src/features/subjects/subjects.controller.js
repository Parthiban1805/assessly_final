// File: src/features/subjects/subjects.controller.js

const subjectService = require('./subjects.service');

// --- THE FIX: Correctly access the nested 'userDetails' object from the token payload ---
/**
 * Handles the request to get all subjects for the currently logged-in student.
 * It uses the user details (year, department) attached to the request by the
 * authentication middleware (`verifyToken`).
 */
const getAllSubjectsForStudent = async (req, res) => {
    try {
        // The `verifyToken` middleware adds the entire token payload to `req.user`.
        // The data is now correctly accessed from the nested 'userDetails' object.
        const userDetails = req.user.userDetails;

        if (!userDetails || !userDetails.year || !userDetails.department) {
            // This check will now pass correctly.
            return res.status(400).json({ message: 'Student details (year, department) not found in token.' });
        }

        const subjects = await subjectService.getSubjectsForStudent(userDetails);
        res.status(200).json(subjects);

    } catch (error) {
        console.error("Error in getAllSubjectsForStudent controller:", error);
        res.status(500).json({ message: 'Server error while fetching subjects.' });
    }
};


// Controller for the CourseView page
const getSingleSubjectDetails = async (req, res) => {
  try {
    const { id } = req.params;
    // IMPORTANT: Get student_id from the authenticated user's details
    // Assuming verifyToken middleware puts user details into req.user.userDetails
    const { student_id } = req.user.userDetails;

    // Convert student_id (likely an ObjectId from Mongoose) to a string
    // because AssessmentResult.studentId is defined as type: String.
    const studentIdString = student_id.toString();

    console.log(`[DEBUG] Controller: Handling request for subject ID: ${id} for student: ${studentIdString}`);

    // Pass the subjectId and the stringified studentId to the service layer
    const subject = await subjectService.getSubjectById(id, studentIdString);

    console.log('[DEBUG] Controller: Sending final subject payload to client:');
    console.log(JSON.stringify(subject, null, 2));

    res.status(200).json(subject);
  } catch (error) {
    console.error(`Error fetching subject details for ID ${req.params.id}:`, error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message || 'Server error' });
  }
};

module.exports = {
  getAllSubjectsForStudent,
  getSingleSubjectDetails,
};