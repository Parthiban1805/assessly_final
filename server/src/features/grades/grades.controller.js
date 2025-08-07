const gradesService = require('./grades.service');
const settingsService = require('../settings/settings.service');

const getGradesPageData = async (req, res) => {
  try {
    // userDetails are available from the verifyToken middleware
    const { userDetails } = req.user;

    // Fetch all necessary data in parallel
    const [grades, displayAllowed] = await Promise.all([
      gradesService.getStudentGrades(userDetails),
      settingsService.getDisplayAnswersSetting(),
    ]);

    // Assemble the single payload for the Grades page
    const pagePayload = {
      grades: grades, // This is now a simple array
      settings: {
        displayAllowed: displayAllowed,
      },
    };

    res.status(200).json(pagePayload);
  } catch (error) {
    console.error('Failed to build grades page data:', error);
    res.status(500).json({ message: 'Error loading page data.' });
  }
};

module.exports = { getGradesPageData };