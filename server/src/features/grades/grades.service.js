const { Grades } = require('./grades.model');

/**
 * Fetches the grades for a specific student and year.
 * @param {object} userDetails - The user details object from the JWT.
 * @returns {Promise<Array>} A promise that resolves to an array of grade subjects.
 */
const getStudentGrades = async (userDetails) => {
  try {
    const { student_id, year } = userDetails;
    const numericYear = year ? parseInt(String(year).match(/\d+/)[0]) : null;

    if (!student_id || !numericYear) {
      throw new Error('Student ID and year are required.');
    }

    // This line will now work because 'Grades' is the actual Mongoose Model
    const gradeData = await Grades.findOne({ studentId: student_id, year: numericYear });

    return gradeData ? gradeData.subjects : [];
  } catch (error) {
    console.error('Error in getStudentGrades service:', error);
    throw new Error('Failed to retrieve student grades.');
  }
};


module.exports = { getStudentGrades };