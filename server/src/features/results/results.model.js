const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
    studentId: { type: String, required: true, index: true },
    assessmentId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Assessment', index: true },
    results: [{
        _id: false, // Don't create _id for subdocuments
        questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
        question: { type: String },
        correctAnswer: { type: String },
        selectedAnswer: { type: String },
        isCorrect: { type: Boolean },
        mark: { type: Number },
    }],
    totalMarks: { type: Number, required: true },
    status_com: { type: String, default: 'completed' },
}, { timestamps: true });

// Compound index for fast lookups
resultSchema.index({ studentId: 1, assessmentId: 1 });

const AssessmentResult = mongoose.model('AssessmentResult', resultSchema);

module.exports = AssessmentResult; // Export the model constructor directly
