const feedbackService = require('./feedback.service');

/**
 * Handles the request to generate personalized AI feedback for a student.
 */
exports.generateFeedback = async (req, res) => {
    try {
        const { studentId, questionStats } = req.body;

        if (!studentId || !questionStats || !Array.isArray(questionStats)) {
            return res.status(400).json({ message: 'Missing studentId or questionStats in request body.' });
        }

        const feedback = await feedbackService.generateAI1Feedback(studentId, questionStats);
        res.status(200).json({ feedback });
    } catch (error) {
        console.error("Error generating feedback:", error);
        res.status(500).json({ message: error.message || 'Failed to generate feedback.' });
    }
};