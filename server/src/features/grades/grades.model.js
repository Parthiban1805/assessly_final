const mongoose = require('mongoose');
const { Schema } = mongoose;

// Schema for the 'Grades' collection
const gradeSchema = new Schema({
    studentId: { type: String, required: true, index: true },
    year: { type: Number, required: true, index: true },
    assesment_count: { type: Number },
    subjects: [{
        _id: false, // Don't create _id for subdocuments
        subject: {
            name: String,
            averageMarks: String
        }
    }]
});

// Create a compound index for efficient queries
gradeSchema.index({ studentId: 1, year: 1 });

// Create the Mongoose model
const Grades = mongoose.model('Grade', gradeSchema);

// Schema for the 'Marks' collection
const marksSchema = new Schema({
    studentId: { type: String, required: true, unique: true },
    assessments: [{
        _id: false,
        assessmentId: { type: Schema.Types.ObjectId, ref: 'Assessment' },
        marks: { type: Number },
        statuses: { type: String, enum: ['completed', 'not-started'] },
        locked: { type: Boolean, default: false }
    }]
});
const Marks = mongoose.model('Marks', marksSchema);

// Export an object containing BOTH models
module.exports = {
    Grades, // The 'Grades' property holds the Grade model
    Marks,
};