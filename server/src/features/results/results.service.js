// File: src/features/results/results.service.js
const mongoose = require('mongoose');
const AssessmentResult = require('./results.model'); 
const { Assessment } = require('../assessments/assessments.model');
const { getDisplayAnswersSetting } = require('../settings/settings.service');

/**
 * Fetches data for the result page, hiding all performance details if the setting is disabled.
 * @param {string} studentId - The ID of the student.
 * @param {string} assessmentId - The ID of the assessment.
 * @returns {Promise<object>} A payload for the result page.
 */
const getResultPageData = async (studentId, assessmentId) => {
    if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
        const err = new Error('Invalid assessment ID format.');
        err.statusCode = 400;
        throw err;
    }

    const [result, assessment, displaySetting] = await Promise.all([
        AssessmentResult.findOne({ 
            studentId: studentId, 
            assessmentId: new mongoose.Types.ObjectId(assessmentId)
        }),
        Assessment.findById(assessmentId).select('name'),
        getDisplayAnswersSetting()
    ]);

    if (!result || !assessment) {
        const err = new Error('Result or Assessment not found.');
        err.statusCode = 404;
        throw err;
    }

    // --- NEW LOGIC: Check the setting first ---
    // If display is disabled, return a minimal payload immediately.
    if (!displaySetting.isEnabled) {
        return {
            assessment: assessment.toObject(),
            displayIsEnabled: false,
            stats: null,  // Explicitly send null for stats
            result: null  // Explicitly send null for detailed results
        };
    }

    // --- This code only runs if the display setting is ON ---
    const totalPossibleMarks = result.results.reduce((sum, item) => sum + (item.mark || 0), 0);
    const correctAnswers = result.results.filter(item => item.isCorrect).length;
    const totalQuestions = result.results.length;

    return {
        assessment: assessment.toObject(),
        stats: {
            totalScore: result.totalMarks,
            totalPossibleMarks,
            correctAnswers,
            totalQuestions,
            percentageScore: totalPossibleMarks > 0 ? Math.round((result.totalMarks / totalPossibleMarks) * 100) : 0,
        },
        displayIsEnabled: true,
        result: result.toObject()
    };
};

module.exports = { getResultPageData };