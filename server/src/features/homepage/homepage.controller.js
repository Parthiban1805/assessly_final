const homepageService = require('./homepage.service');

const getHomePageData = async (req, res) => {
  try {
    // req.user is attached by the verifyToken middleware
    const { userDetails } = req.user;

    // Fetch initial page data in parallel
    const [subjects, club] = await Promise.all([
      homepageService.getAcademicSubjects(userDetails),
      homepageService.getStudentClub(userDetails.student_id),
    ]);

    // Assemble the single payload for the homepage
    const homepagePayload = {
      userDetails,
      subjects,
      club,
    };

    res.status(200).json(homepagePayload);
  } catch (error) {
    console.error('Failed to get homepage data:', error);
    res.status(500).json({ message: 'Error loading page data.' });
  }
};

module.exports = { getHomePageData };