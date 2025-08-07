// Import Mongoose models from their feature folders
const {Subject} = require('../subjects/subjects.model'); // Adjust path as needed
const Student = require('../users/users.model').Student; // Adjust path as needed

/**
 * Fetches the academic subjects for a given student.
 * @param {object} userDetails - The user details from the JWT.
 * @returns {Promise<Array>} A promise that resolves to an array of subject documents.
 */
const getAcademicSubjects = async (userDetails) => {
  const { year, department } = userDetails;
  if (!year || !department) {
    throw new Error('Year and department are required from user details.');
  }

  const yearMapping = { '1st': 1, '2nd': 2, '3rd': 3, '4th': 4 };
  const numericYear = yearMapping[String(year).toLowerCase()] || Number(year);

  const subjects = await Subject.find({
    year: numericYear,
    department: department,
  });

  return subjects;
};

/**
 * Fetches the student's currently selected club.
 * @param {string} student_id - The student's unique ID.
 * @returns {Promise<string>} A promise that resolves to the student's club name or an empty string.
 */
const getStudentClub = async (student_id) => {
  const student = await Student.findOne({ student_id }).select('club');
  return student ? student.club : '';
};

module.exports = {
  getAcademicSubjects,
  getStudentClub,
};