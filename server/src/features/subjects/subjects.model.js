const mongoose = require('mongoose');
const { Schema } = mongoose;
const Assessment = require('../assessments/assessments.model').Assessment;

/**
 * Sub-schema for individual subject performance per student
 */
const SubjectPerformanceSchema = new Schema({
  subjectRef: {
    type: Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  totalAssessments: {
    type: Number,
    default: 0
  },
  totalMarks: {
    type: Number,
    default: 0
  },
  presentAssessments: {
    type: Number,
    default: 0
  }
});

/**
 * Combined schema that holds student and their subject performance,
 * while keeping the reference to actual Subject documents.
 */
const StudentSubjectSchema = new Schema({
  studentId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  subjects: [SubjectPerformanceSchema]
});

/**
 * Schema for Subject metadata (shared across students)
 */
const SubjectSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Subject name is required.'],
    trim: true
  },
  year: {
    type: Number,
    required: [true, 'Academic year is required.']
  },
  department: {
    type: String,
    required: [true, 'Department is required.']
  },
  description: {
    type: String,
    default: 'No description available.'
  },
  staff: {
    type: String,
    default: 'Staff not assigned'
  },
  club: {
    type: String
  },
  assessments: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Assessment'
    }
  ],
  totalAssessments: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

SubjectSchema.index({ year: 1, department: 1 });

// Models
const Subject = mongoose.model('Subject', SubjectSchema, 'sub1');
const StudentSubject = mongoose.model('StudentSubject', StudentSubjectSchema);

module.exports = {
  Subject,
  StudentSubject
};
