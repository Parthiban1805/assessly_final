const resultsService = require('./results.service');

const getResultPageData = async (req, res) => {
  console.log("DEBUG: Inside getResultPageData controller.");
  console.log("DEBUG: req.params inside controller:", req.params);
  console.log("DEBUG: req.user.userDetails inside controller:", req.user ? req.user.userDetails : 'req.user is undefined');

  try {
    let studentIdToFetch;
    const { assessmentId } = req.params; // Always extract assessmentId from params

    // Determine the studentId to use for fetching the result:
    // 1. If req.params.studentId is present (e.g., from /results/:studentId/:assessmentId route), use it.
    //    This is the case for teachers/admins viewing a specific student's result.
    if (req.params.studentId) {
      studentIdToFetch = req.params.studentId;
      console.log("DEBUG: Using studentId from URL params:", studentIdToFetch);
    } 
    // 2. If req.params.studentId is NOT present, it means the route was /results/:assessmentId
    //    In this case, the logged-in user MUST be a student viewing their OWN result.
    //    We then get the studentId from their token (req.user.userDetails.student_id).
    else if (req.user && req.user.userDetails && req.user.userDetails.student_id) {
      studentIdToFetch = req.user.userDetails.student_id;
      console.log("DEBUG: Using studentId from user token (student's own result):", studentIdToFetch);
    } 
    // 3. If neither of the above conditions is met, we don't have a studentId to work with.
    else {
      console.error("ERROR: No student ID found in URL parameters or user token.");
      return res.status(400).json({ message: 'Student ID not found in request. Invalid access.' });
    }

    console.log("DEBUG: Final studentIdToFetch determined as:", studentIdToFetch);
    console.log("DEBUG: AssessmentId for service call:", assessmentId);

    const pageData = await resultsService.getResultPageData(studentIdToFetch, assessmentId);

    res.status(200).json(pageData);
  } catch (error) {
    console.error('Error fetching result page data:', error);
    // Use error.statusCode if available (from service), otherwise default to 500
    res.status(error.statusCode || 500).json({ message: error.message || 'Server error' });
  }
};

module.exports = { getResultPageData };