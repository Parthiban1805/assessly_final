// File: src/features/assessments/assessments.model.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

//==================================================
// 1. Core Assessment Schema
// Defines the assessment itself, its rules, and timing.
//==================================================
const assessmentSchema = new Schema({
    name: { type: String, required: true },
    subjectName: { type: String, required: true },
    department: { type: String, required: true },
    year: { type: Number, required: true },
    openDate: { type: Date, required: true },
    openTime: { type: String, required: true },
    closeDate: { type: Date, required: true },
    closeTime: { type: String, required: true },
    openDateTime: { type: Date }, // Combined field for easier querying
    closeDateTime: { type: Date },// Combined field for easier querying
    examDurationMinutes: { type: Number, default: 60 },
    questionperstudent: { type: Number },
    tags: [{
        name: String,
        weightage: Number,
    }],
    allowFlexibleTiming: { type: Boolean, default: false }, // If true, duration timer starts on student entry
    trackViolations: { type: Boolean, default: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher' },
}, { timestamps: true });

// Middleware to combine date and time before saving
assessmentSchema.pre('save', function(next) {
    if (this.openDate && this.openTime) {
        const [hours, minutes] = this.openTime.split(':');
        const openDateTime = new Date(this.openDate);
        openDateTime.setHours(hours, minutes, 0, 0);
        this.openDateTime = openDateTime;
    }
    if (this.closeDate && this.closeTime) {
        const [hours, minutes] = this.closeTime.split(':');
        const closeDateTime = new Date(this.closeDate);
        closeDateTime.setHours(hours, minutes, 0, 0);
        this.closeDateTime = closeDateTime;
    }
    next();
});

const Assessment = mongoose.model('Assessment', assessmentSchema,'ass1');


//==================================================
// 2. Question Bank Schema
// Stores the actual questions and answers for an assessment.
//==================================================
const questionSchema = new Schema({
    assessmentId: { type: Schema.Types.ObjectId, ref: 'Assessment', required: true, index: true },
    questions: [{
        question: { type: String, required: true },
        options: [{ type: String, required: true }],
        answer: { type: String, required: true },
        mark: { type: Number, default: 1 },
        tag: { type: String, default: 'General' } // For weighted question selection
    }]
});

const Question = mongoose.model('Question', questionSchema);


//==================================================
// 3. Assigned Questions Schema
// Tracks which specific questions were given to a student and their saved answers.
//==================================================
const assignedQuestionsSchema = new Schema({
    studentId: { type: String, required: true, index: true },
    assessmentId: { type: Schema.Types.ObjectId, ref: 'Assessment', required: true, index: true },
    questions: { type: Array, required: true }, // The specific questions assigned
    answeredquestions: [{ // Student's saved progress
        questionId: { type: String },
        selectedOption: { type: String }
    }]
}, { timestamps: true });

// Compound index for faster lookups
assignedQuestionsSchema.index({ studentId: 1, assessmentId: 1 });

const AssignedQuestions = mongoose.model('AssignedQuestions', assignedQuestionsSchema);


//==================================================
// 4. Student Answers Schema (Final Submission Log)
// A permanent record of a student's final submitted answers.
//==================================================
const studentAnswersSchema = new Schema({
    studentId: { type: String, required: true },
    assessmentId: { type: Schema.Types.ObjectId, ref: 'Assessment', required: true },
    year: { type: Number },
    answers: [{
        questionId: String,
        selectedAnswer: String
    }],
    submittedAt: { type: Date, default: Date.now }
});

const StudentAnswers = mongoose.model('StudentAnswers', studentAnswersSchema);


//==================================================
// 5. Answer Check Schema (Status Tracking)
// A simple document to quickly check if a student has completed an assessment.
//==================================================
const answerCheckSchema = new Schema({
    studentId: { type: String, required: true },
    assessmentId: { type: Schema.Types.ObjectId, ref: 'Assessment', required: true },
    status_com: { type: String, default: 'completed' }
});

const AnswerCheck = mongoose.model('AnswerCheck', answerCheckSchema);


//==================================================
// Export all models from this feature
//==================================================
module.exports = {
    Assessment,
    Question,
    AssignedQuestions,
    StudentAnswers,
    AnswerCheck
};