// File: src/features/results/results.service.js
const mongoose = require('mongoose');
const AssessmentResult = require('./results.model'); 

// The import for Assessment is likely correct because its model file exports an object.
const { Assessment } = require('../assessments/assessments.model');

/**
 * Fetches all data needed for the result page, using the correct data types for querying.
 * @param {string} studentId - The custom string ID of the student (from JWT).
 * @param {string} assessmentId - The ObjectId string of the assessment (from URL params).
 * @returns {Promise<object>} A combined payload for the result page.
 */
const getResultPageData = async (studentId, assessmentId) => {
    // 1. Validate that assessmentId has the correct format before querying
    if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
        const err = new Error('Invalid assessment ID format.');
        err.statusCode = 400; // Bad Request
        throw err;
    }

    // This check is crucial for debugging import issues.
    if (!AssessmentResult || typeof AssessmentResult.findOne !== 'function') {
        throw new Error('Internal Server Error: AssessmentResult model is not loaded correctly.');
    }

    // 2. Fetch data using the correct types for each field.
    const [result, assessment] = await Promise.all([
        AssessmentResult.findOne({ // This line will now work
            studentId: studentId, 
            assessmentId: new mongoose.Types.ObjectId(assessmentId)
        }),
        Assessment.findById(assessmentId).select('name')
    ]);

    // 3. Handle cases where the data is not found
    if (!result) {
        console.warn(`Result not found for studentId: "${studentId}" and assessmentId: "${assessmentId}"`);
        const err = new Error('Result not found for this assessment. It may still be processing or was not submitted.');
        err.statusCode = 404;
        throw err;
    }
    
    if (!assessment) {
        const err = new Error('Associated assessment details not found.');
        err.statusCode = 404;
        throw err;
    }

    // 4. Calculate stats and return the structured payload
    const totalPossibleMarks = result.results.reduce((sum, item) => sum + (item.mark || 0), 0);
    const correctAnswers = result.results.filter(item => item.isCorrect).length;
    const totalQuestions = result.results.length;

    return {
        result: result.toObject(),
        assessment: assessment.toObject(),
        stats: {
            totalPossibleMarks,
            correctAnswers,
            totalQuestions,
            percentageScore: totalPossibleMarks > 0 ? Math.round((result.totalMarks / totalPossibleMarks) * 100) : 0,
        }
    };
};

module.exports = { getResultPageData };