// File: controllers/analytics.controller.js
const analyticsService = require('./analytics.service');

exports.getTeacherAssessments = async (req, res) => {
  try {
    // FIX: Access teacher_id from req.user.userDetails
    const teacherCode = req.user.userDetails.teacher_id; 
    
    // This check will now correctly evaluate if teacher_id is present
    if (!teacherCode) {
        // This case should ideally not be hit if auth.middleware is set up correctly
        // and teacher_id is guaranteed in teacher tokens.
        return res.status(401).json({ message: 'Teacher ID not found in token payload.' });
    }

    const assessments = await analyticsService.fetchTeacherAssessments(teacherCode, req.query);
    res.json(assessments);
  } catch (err) {
    console.error("Error in getTeacherAssessments controller:", err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getStudentMarksForAssessment = async (req, res) => {
    try {
        const { assessmentId } = req.params;
        const studentMarks = await analyticsService.getStudentMarksForAssessment(assessmentId);
        res.status(200).json(studentMarks);
    } catch (err) {
        console.error("Error in getStudentMarksForAssessment controller:", err);
        // Use err.status for custom errors from service, default to 500
        res.status(err.status || 500).json({ message: err.message || 'Server error while fetching student marks.' });
    }
};

exports.getAnalyticsSummary = async (req, res) => {
  try {
    const summary = await analyticsService.generateAnalyticsSummary(req.query.assessmentId);
    res.json(summary);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

exports.getTopPerformers = async (req, res) => {
  try {
    const performers = await analyticsService.getTopPerformers(req.query.assessmentId, req.query.limit);
    res.json(performers);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getPerformanceGraph = async (req, res) => {
  try {
    const graphData = await analyticsService.getPerformanceGraphData(req.query.assessmentId, req.query.limit);
    res.json(graphData);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getStudentPerformance = async (req, res) => {
  try {
    const data = await analyticsService.getStudentPerformance(req.query.assessmentId, req.query.studentId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getPerformanceDistribution = async (req, res) => {
  try {
    const data = await analyticsService.getPerformanceDistribution(req.query.assessmentId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getQuestionPerformance = async (req, res) => {
  try {
    const data = await analyticsService.getQuestionPerformance(req.query.assessmentId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
