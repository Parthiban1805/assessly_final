// File: src/features/dashboard/dashboard.controller.js

const dashboardService = require('./dashboard.service');
const Student = require('../users/users.model').Student;

const getStudentDashboard = async (req, res) => {
  try {
    const { userDetails: tokenDetails } = req.user;

    if (!tokenDetails || !tokenDetails.student_id) {
      return res.status(400).json({ message: 'Student ID not found in token' });
    }

    const fullUserDetails = await Student.findOne({ student_id: tokenDetails.student_id })
      .select('-password')
      .lean();

    if (!fullUserDetails) {
      return res.status(404).json({ message: 'Student record not found.' });
    }
    
    const [
      courseData,
      performanceData,
      todayAssessments,
      notifications,
      displaySettings,
      attendanceData,
    ] = await Promise.all([
      dashboardService.getCourseSummary(fullUserDetails),
      dashboardService.getPerformanceData(fullUserDetails),
      dashboardService.getTodaysAssessments(),
      dashboardService.getNotifications(),
      dashboardService.getDisplaySettings(),
      dashboardService.getAttendance(fullUserDetails.student_id),
    ]);

    // Assemble the single, unified payload
    const dashboardPayload = {
      userDetails: fullUserDetails, 
      courseData,
      performanceData,
      todayAssessments,
      notifications,
      // FIX: Use the new attendance object and provide a consistent fallback.
      attendance: attendanceData || { total: 0, attended: 0, percentage: '0.00' },
      settings: {
        displayAllowed: displaySettings ? displaySettings.isEnabled : true,
      },
    };

    res.status(200).json(dashboardPayload);
  } catch (error) {
    console.error('Failed to build student dashboard:', error);
    res.status(500).json({ message: 'Error loading dashboard data.' });
  }
};

module.exports = { getStudentDashboard };