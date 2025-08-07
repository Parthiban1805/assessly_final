const assessmentService = require('./assessments.service');
const settingsService = require('../settings/settings.service'); // Assuming settings has its own feature

// Controller for AssessmentHandler
const getHandlerPageData = async (req, res) => {
    try {
        const { assessmentId } = req.params;
        const { student_id } = req.user.userDetails;

        const [statusData, displayAnswers] = await Promise.all([
            assessmentService.getAssessmentStatusAndDetails(student_id, assessmentId),
            settingsService.getDisplayAnswersSetting() // From settings feature
        ]);

        res.status(200).json({
            status: statusData.status,
            assessmentDetails: statusData.assessment,
            settings: { displayAnswers }
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message || 'Server Error' });
    }
};

// Controller for getting initial data for AssessmentPage
const getAssessmentPageData = async (req, res) => {
    try {
        const { assessmentId } = req.params;
        const { student_id } = req.user.userDetails;
        const { assessment, assignedQuestions } = await assessmentService.getInitialAssessmentData(student_id, assessmentId);
        
        res.status(200).json({
            assessment,
            questions: assignedQuestions.questions,
            savedAnswers: assignedQuestions.answeredquestions,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message || 'Server Error' });
    }
};

// Controller for saving progress
const saveProgress = async (req, res) => {
    try {
        const { assessmentId } = req.params;
        const { student_id } = req.user.userDetails;
        const { answeredquestions } = req.body;
        await assessmentService.saveAnswerProgress(student_id, assessmentId, answeredquestions);
        res.status(200).json({ message: 'Progress saved.' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to save progress.' });
    }
};

// Controller for final submission
const handleSubmit = async (req, res) => {
    try {
        const { assessmentId } = req.params;
        const { userDetails } = req.user;
        const { answers } = req.body;
        const result = await assessmentService.submitAssessment(userDetails.student_id, assessmentId, answers, userDetails);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: 'Failed to submit assessment.' });
    }
};

// Controller for violation lock
const handleLock = async (req, res) => {
    try {
        const { assessmentId } = req.params;
        const { student_id } = req.user.userDetails;
        const result = await assessmentService.lockStudentAssessment(student_id, assessmentId);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: 'Failed to lock assessment.' });
    }
}
const createAssessment = async (req, res) => {
    try {
        // teacherDetails are available from the verifyToken middleware
        const { userDetails: teacherDetails } = req.user;
        console.log("Creating assessment with teacher details:", teacherDetails);
        const savedAssessment = await assessmentService.createAssessmentWithQuestions(
            req.body,       // The form fields
            teacherDetails, // The secure user details from the token
            req.file        // The uploaded file from multer
        );

        res.status(201).json({
            message: 'Assessment and questions created successfully.',
            assessment: savedAssessment,
        });
    } catch (error) {
        console.error('Error creating assessment:', error);
        res.status(error.statusCode || 500).json({ message: error.message || 'Server error' });
    }
};

const getMyAssessments = async (req, res) => {
    try {
        // The teacher's ID is securely retrieved from the token payload
        const { teacher_id } = req.user.userDetails;
        console.log("Fetching assessments for teacher ID:", teacher_id);
        // Call the service to get assessments for the teacher
        const assessments = await assessmentService.getAssessmentsByTeacher(teacher_id);

        res.status(200).json(assessments);
    } catch (error) {
        console.error('Error fetching teacher assessments:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

const getAllAssessments = async (req, res) => {
    try {
        const assessments = await assessmentService.getAllAssessmentsForAdmin();
        res.status(200).json(assessments);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching all assessments.' });
    }
};

const deleteAssessment = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await assessmentService.deleteAssessmentById(id);
        res.status(200).json(result);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message || 'Server error' });
    }
};

const getAssessmentDetailsById = async (req, res) => {
    try {
        const { assessmentId } = req.params;
        const assessmentDetails = await assessmentService.getAssessmentDetailsById(assessmentId);
        res.status(200).json(assessmentDetails);
    } catch (error) {
        console.error("Error fetching assessment details by ID:", error);
        res.status(error.statusCode || 500).json({ message: error.message || 'Failed to retrieve assessment details.' });
    }
};


module.exports = { getHandlerPageData, getAssessmentPageData, saveProgress, handleSubmit, handleLock ,createAssessment,getMyAssessments, getAllAssessments,
    deleteAssessment, getAssessmentDetailsById };