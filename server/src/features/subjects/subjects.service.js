// File: src/api/v1/subjects/subjects.service.js

const { Subject } = require('./subjects.model'); // Your Subject model
const AssessmentResult = require('../results/results.model'); // Correct path to your AssessmentResult model
// Assuming you have a custom error class like AppError or similar for structured errors
// const AppError = require('../../utils/appError');

/**
 * Helper to determine an assessment's status for a given student.
 * This logic relies solely on AssessmentResult and assessment dates.
 * It DOES NOT support 'In Progress' or 'Locked' statuses if those states
 * are not explicitly stored in the AssessmentResult model.
 *
 * @param {string} studentId - The ID of the student (as a string).
 * @param {object} assessment - The assessment document (Mongoose lean object).
 * @returns {string} The status string (e.g., 'Upcoming', 'Not Started', 'Completed', 'Missed').
 */
const getAssessmentStatusForStudent = async (studentId, assessment) => {
    const now = new Date();
    // Ensure dates are parsed correctly to include time for comparison
    const openDateTime = new Date(`${assessment.openDate}T${assessment.openTime}`);
    const closeDateTime = new Date(`${assessment.closeDate}T${assessment.closeTime}`);

    // Check if the student has a completed result for this assessment
    // Using .exists() is efficient as it only checks for document existence, not retrieves it.
    const hasCompleted = await AssessmentResult.exists({
        studentId: studentId, // This studentId is already a string
        assessmentId: assessment._id
    });

    if (hasCompleted) {
        return 'Completed';
    } else if (now < openDateTime) {
        return 'Upcoming';
    } else if (now > closeDateTime) {
        // If it's past the close date and no completed result exists, it's considered missed.
        return 'Missed';
    } else {
        // If it's within the open/close window and not completed, it's 'Not Started'.
        // We cannot determine 'In Progress' with just AssessmentResult.
        return 'Not Started';
    }
};

/**
 * Finds a single subject by its ID and populates its assessments,
 * then adds the status for each assessment for the given student.
 * @param {string} subjectId - The ID of the subject.
 * @param {string} studentId - The ID of the student (as a string).
 * @returns {Promise<object>} The subject document with populated assessments and their statuses.
 */
const getSubjectById = async (subjectId, studentId) => {
  // Use .populate('assessments') to replace the IDs with the full assessment documents.
  // .lean() returns plain JavaScript objects, making it easier to add new properties.
  const subject = await Subject.findById(subjectId)
    .populate('assessments')
    .lean();

  if (!subject) {
    const error = new Error('Subject not found.');
    error.statusCode = 404; // Use your custom error class if available (e.g., throw new AppError('Subject not found.', 404);)
    throw error;
  }

  // Map over each assessment to add its status for the current student
  // Use Promise.all to concurrently fetch statuses for all assessments
  const assessmentsWithStatus = await Promise.all(
      subject.assessments.map(async (assessment) => {
          const status = await getAssessmentStatusForStudent(studentId, assessment);
          return { ...assessment, status }; // Add the 'status' field to each assessment object
      })
  );

  return { ...subject, assessments: assessmentsWithStatus };
};

/**
 * Fetches all subjects relevant to a student based on their year and department.
 * (This function remains as per your original code)
 * @param {object} userDetails - The user details from the token (where year is a String).
 * @returns {Promise<Array<object>>} A list of subjects.
 */
const getSubjectsForStudent = async (userDetails) => {
    const studentYearAsNumber = parseInt(userDetails.year, 10);

    if (isNaN(studentYearAsNumber)) {
      console.error(`Invalid year format for student ${userDetails.id}: "${userDetails.year}"`);
      return [];
    }

    const subjects = await Subject.find({
        year: studentYearAsNumber,
        department: userDetails.department,
    }).lean();

    return subjects;
};

module.exports = {
  getSubjectById,
  getSubjectsForStudent
};