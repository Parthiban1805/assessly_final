// File: src/api/v1/subjects/subjects.service.js (Modified)

const { Subject } = require('./subjects.model');

/**
 * Finds a single subject by its ID and populates its assessments.
 * @param {string} subjectId - The ID of the subject.
 * @returns {Promise<object>} The subject document with populated assessments.
 */
const getSubjectById = async (subjectId) => {
  // Use .populate('assessments') to replace the IDs with the full assessment documents.
  const subject = await Subject.findById(subjectId)
    .populate('assessments')
    .lean();

  if (!subject) {
    const error = new Error('Subject not found.');
    error.statusCode = 404;
    throw error;
  }
  return subject;
};

/**
 * Fetches all subjects relevant to a student based on their year and department.
 * @param {object} userDetails - The user details from the token (where year is a String).
 * @returns {Promise<Array<object>>} A list of subjects.
 */
const getSubjectsForStudent = async (userDetails) => {
    // THE FIX: Convert the student's year (String) to a number for the query.
    const studentYearAsNumber = parseInt(userDetails.year, 10);

    // Safety check in case the year is not a valid number
    if (isNaN(studentYearAsNumber)) {
      console.error(`Invalid year format for student ${userDetails.id}: "${userDetails.year}"`);
      return [];
    }
    
    const subjects = await Subject.find({
        year: studentYearAsNumber, // Use the corrected Number type
        department: userDetails.department,
    }).lean();
    
    return subjects;
};

module.exports = {
  getSubjectById,
  getSubjectsForStudent
};