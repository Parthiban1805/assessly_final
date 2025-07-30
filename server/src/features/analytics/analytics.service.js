// File: services/analytics.service.js
const mongoose = require('mongoose');
const { Assessment } = require('../assessments/assessments.model');
const AssessmentResult = require('../results/results.model');
const Student = require('../users/users.model');
const { Marks } = require('../grades/grades.model');

exports.fetchTeacherAssessments = async (teacherCode, query) => {
  const { department, subjects } = query;
  const filter = { teacher_id: teacherCode };

  if (department) filter.department = department;
  if (subjects) {
    try { filter.subjectName = decodeURIComponent(subjects); } catch (_) {
      filter.subjectName = subjects;
    }
  }

  return await Assessment.find(filter)
    .select('_id name subjectName department openDate openTime closeDate closeTime marks')
    .sort({ openDate: -1 });
};

exports.generateAnalyticsSummary = async (assessmentId) => {
  if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
    throw { status: 400, message: 'Invalid assessmentId' };
  }

  const assessment = await Assessment.findById(assessmentId).select('marks name subjectName');
  if (!assessment) throw { status: 404, message: 'Assessment not found' };

  const { averagePercentage, totalStudents, totalQuestions } = await getClassAverage(assessmentId);

  const buckets = [
    { label: 'High (80-100%)', range: [80, 101], count: 0, color: '#10B981' },
    { label: 'Medium (50-79%)', range: [50, 80], count: 0, color: '#F59E0B' },
    { label: 'Low (0-49%)', range: [0, 50], count: 0, color: '#EF4444' },
  ];

  const results = await AssessmentResult.find({ assessmentId, status_com: 'completed' }).select('totalMarks results');
  results.forEach(r => {
    const pct = totalQuestions ? (r.totalMarks / totalQuestions) * 100 : 0;
    const bucket = buckets.find(b => pct >= b.range[0] && pct < b.range[1]);
    if (bucket) bucket.count++;
  });

  const topPerformers = await getTopPerformers(assessmentId, 10);

  return {
    assessmentInfo: { name: assessment.name, subject: assessment.subjectName },
    summary: { total: totalQuestions, scored: Math.round((averagePercentage / 100) * totalQuestions) },
    totalStudents,
    averagePercentage,
    performanceGroups: buckets,
    topPerformers,
    inference: `Class of ${totalStudents} students averaged ${averagePercentage}% on ${totalQuestions} questions.`
  };
};

exports.getTopPerformers = async (assessmentId, limit = 10) => {
  const performers = await getTopPerformers(assessmentId, limit);
  return { topPerformers: performers, total: performers.length };
};

exports.getPerformanceGraphData = async (assessmentId, limit = 10) => {
  const { averagePercentage, totalQuestions } = await getClassAverage(assessmentId);
  const toppers = await getTopPerformers(assessmentId, limit);

  const labels = ['Class Average', ...toppers.map(t => t.name)];
  const avgRaw = Math.round((averagePercentage / 100) * totalQuestions);
  const scoreData = [avgRaw, ...toppers.map(t => t.score)];
  const totalMarksLine = Array(labels.length).fill(totalQuestions);

  return {
    labels,
    datasets: [
      { label: 'Score', data: scoreData },
      { label: 'Total Marks', data: totalMarksLine }
    ]
  };
};

exports.getStudentPerformance = async (assessmentId, studentId) => {
  const result = await AssessmentResult.findOne({
    assessmentId,
    studentId,
    status_com: 'completed'
  });

  if (!result) throw { status: 404, message: 'Not found' };

  const student = await Student.findOne({ student_id: studentId }).select('name email student_id');
  const totalQuestions = result.results.length;
  const correctAnswers = result.totalMarks;
  const percentage = totalQuestions ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

  return {
    student: { id: studentId, name: student?.name, email: student?.email },
    performance: {
      totalQuestions,
      correctAnswers,
      wrongAnswers: totalQuestions - correctAnswers,
      percentage,
      totalMarks: correctAnswers,
      submittedAt: result.createdAt
    },
    questionAnalysis: result.results.map((q, i) => ({
      questionNumber: i + 1,
      question: q.question,
      correctAnswer: q.correctAnswer,
      selectedAnswer: q.selectedAnswer,
      isCorrect: q.isCorrect,
      mark: q.mark
    }))
  };
};

exports.getStudentMarksForAssessment = async (assessmentId) => {
    if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
        throw { status: 400, message: 'Invalid assessment ID format.' };
    }

    // Find all Marks documents that contain this assessment ID in their 'assessments' array
    const marksRecords = await Marks.find({ 'assessments.assessmentId': assessmentId })
        .select('studentId assessments.$') // Selects only the matching subdocument
        .lean();

    if (!marksRecords || marksRecords.length === 0) {
        return []; // No students have results for this assessment yet
    }

    // Optionally, you might want to fetch details for students who *haven't* started
    // by comparing against all students expected to take this assessment.
    // For now, this returns only students who have an entry in the Marks collection.

    return marksRecords.map(record => {
        const assessmentEntry = record.assessments[0]; // Since we used $ to select the matching one
        return {
            studentId: record.studentId,
            marks: assessmentEntry.marks,
            status: assessmentEntry.statuses,
            locked: assessmentEntry.locked, // Include locked status if applicable
        };
    });
};

exports.getPerformanceDistribution = async (assessmentId) => {
  const results = await AssessmentResult.find({ assessmentId, status_com: 'completed' }).select('totalMarks results');
  if (!results.length) {
    return {
      ranges: [
        { label: '0-30%', count: 0, percentage: 0, color: '#EF4444' },
        { label: '30-60%', count: 0, percentage: 0, color: '#F59E0B' },
        { label: '60-100%', count: 0, percentage: 0, color: '#10B981' }
      ],
      totalStudents: 0
    };
  }

  const totalQuestions = results[0].results.length;
  const totalStudents = results.length;
  const ranges = [
    { label: '0-30%', min: 0, max: 30, count: 0, color: '#EF4444' },
    { label: '30-60%', min: 30, max: 60, count: 0, color: '#F59E0B' },
    { label: '60-100%', min: 60, max: 100, count: 0, color: '#10B981' }
  ];

  results.forEach(result => {
    const percentage = totalQuestions ? (result.totalMarks / totalQuestions) * 100 : 0;
    const range = ranges.find(r => percentage >= r.min && (percentage < r.max || r.max === 100));
    if (range) range.count++;
  });

  ranges.forEach(range => {
    range.percentage = Math.round((range.count / totalStudents) * 100);
  });

  return { ranges, totalStudents };
};

exports.getQuestionPerformance = async (assessmentId) => {
  const results = await AssessmentResult.find({ assessmentId, status_com: 'completed' }).select('results');
  if (!results.length) return { questionStats: [], totalStudents: 0 };

  const totalStudents = results.length;
  const totalQuestions = results[0].results.length;
  const questionStats = Array.from({ length: totalQuestions }, (_, i) => ({
    questionNumber: i + 1,
    question: results[0].results[i].question || `Question ${i + 1}`,
    correctCount: 0,
    incorrectCount: 0,
    correctPercentage: 0,
    difficulty: 'Medium'
  }));

  results.forEach(result => {
    result.results.forEach((q, i) => {
      if (q.isCorrect) questionStats[i].correctCount++;
      else questionStats[i].incorrectCount++;
    });
  });

  questionStats.forEach(stat => {
    stat.correctPercentage = Math.round((stat.correctCount / totalStudents) * 100);
    stat.difficulty = stat.correctPercentage >= 80
      ? 'Easy' : stat.correctPercentage >= 50
      ? 'Medium' : 'Hard';
    stat.color = stat.difficulty === 'Easy'
      ? '#10B981' : stat.difficulty === 'Medium'
      ? '#F59E0B' : '#EF4444';
  });

  questionStats.sort((a, b) => b.correctPercentage - a.correctPercentage);

  return {
    questionStats,
    totalStudents,
    totalQuestions,
    summary: {
      easiestQuestion: questionStats[0],
      hardestQuestion: questionStats[questionStats.length - 1],
      averageCorrectPercentage: Math.round(
        questionStats.reduce((sum, q) => sum + q.correctPercentage, 0) / totalQuestions
      )
    }
  };
};

// Shared helpers
async function getClassAverage(assessmentId) {
  const results = await AssessmentResult.find({ assessmentId, status_com: 'completed' }).select('totalMarks results');
  const totalStudents = results.length;
  if (!totalStudents) return { averagePercentage: 0, totalStudents: 0, totalQuestions: 0 };

  const totalQuestions = results[0].results.length;
  const totalMarksSum = results.reduce((sum, r) => sum + r.totalMarks, 0);
  const averagePercent = totalQuestions > 0
    ? Math.round((totalMarksSum / (totalStudents * totalQuestions)) * 100)
    : 0;

  return { averagePercentage: averagePercent, totalStudents, totalQuestions };
}

async function getTopPerformers(assessmentId, limit = 10) {
  const raw = await AssessmentResult.find({ assessmentId, status_com: 'completed' }).select('studentId totalMarks results createdAt');
  if (!raw.length || raw.every(r => r.totalMarks === 0)) return [];

  const totalQuestions = raw[0].results.length;

  const enriched = await Promise.all(raw.map(async r => {
    const student = await Student.findOne({ student_id: r.studentId }).select('name email student_id');
    return {
      studentId: r.studentId,
      name: student?.name || `Student ${r.studentId}`,
      score: r.totalMarks,
      totalQuestions,
      percentage: totalQuestions ? Math.round((r.totalMarks / totalQuestions) * 100) : 0,
      submittedAt: r.createdAt
    };
  }));

  enriched.sort((a, b) => b.score !== a.score ? b.score - a.score : a.name.localeCompare(b.name));
  return enriched.slice(0, limit);
}
