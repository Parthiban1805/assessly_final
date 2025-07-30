const Groq = require('groq-sdk');
require('dotenv').config();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY, // Ensure this key is set in your .env
});

/**
 * Generates personalized feedback for a student based on their assessment results.
 * @param {string} studentId - The ID of the student.
 * @param {Array<object>} questionStats - An array of objects, each containing question, selectedAnswer, correctAnswer, etc.
 * @returns {Promise<string>} The AI-generated feedback.
 */
exports.generateAI1Feedback = async (studentId, questionStats) => {
    // Construct a readable summary of the student's performance
    let performanceSummary = `Student ID: ${studentId}\n\n`;
    let correctCount = 0;
    let totalQuestions = questionStats.length;

    questionStats.forEach((q, index) => {
        const status = q.selectedAnswer === q.correctAnswer ? 'Correct' : 'Incorrect';
        if (status === 'Correct') {
            correctCount++;
        }
        performanceSummary += `Q${index + 1}: ${q.question}\n`;
        performanceSummary += `  Your Answer: "${q.selectedAnswer}"\n`;
        performanceSummary += `  Correct Answer: "${q.correctAnswer}"\n`;
        performanceSummary += `  Status: ${status}\n`;
        performanceSummary += `  Topic: ${q.topic}\n`;
        performanceSummary += `  Time Taken: ${q.timeTakenSec} seconds\n\n`;
    });

    const percentage = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
    performanceSummary += `Overall: ${correctCount} out of ${totalQuestions} (${percentage.toFixed(2)}%)\n`;

    const messages = [
        {
            role: 'system',
            content: `You are an AI teaching assistant. Your task is to provide constructive and personalized feedback to a student based on their assessment performance.
                      Focus on:
                      - Acknowledging their score/performance (e.g., "Good job", "Areas for improvement").
                      - Identifying patterns: Are there specific topics they struggled with? Did they take too long on certain questions?
                      - Providing actionable advice: What should they study next? What strategies can they use?
                      - Maintaining a supportive and encouraging tone.
                      - Keep the feedback concise, ideally between 3-5 paragraphs.
                      - Do NOT act as a chatbot. Just provide the feedback.
                      - Do NOT ask questions.
                      - Do NOT include a greeting or closing salutation.
                      - Do NOT mention anything about API calls or data processing.

                      Here is the student's performance data:\n\n${performanceSummary}`
        },
        {
            role: 'user',
            content: 'Generate personalized feedback for this student based on the provided assessment results.'
        }
    ];

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages,
            model: 'llama3-8b-8192', // A smaller model for faster feedback generation
            temperature: 0.7, // Adjust for creativity vs. directness
        });

        return chatCompletion.choices[0].message.content;
    } catch (error) {
        console.error("Error calling Groq API for feedback:", error);
        throw new Error("Failed to generate AI feedback.");
    }
};