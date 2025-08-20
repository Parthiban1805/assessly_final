// File: src/features/dashboard/dashboard.service.js
const axios = require('axios');
const moment = require('moment-timezone');

const { Marks, Grades } = require('../grades/grades.model.js'); // Import both from the new file
const Assessment = require('../assessments/assessments.model').Assessment;
const Student = require('../users/users.model').Student; // Example path
const { Subject, StudentSubject } = require('../subjects/subjects.model');
const ImportantNotification = require('../notifications/notifications.model.js'); // Example path
const Settings = require('../settings/settings.model'); // Example path

// --- Service Functions ---

/**
 * Calculates the course summary (total assessments, attended, marks) for a student.
 * @param {object} userDetails - The user details object from the JWT.
 * @returns {Promise<Array>} A promise that resolves to an array of course summary objects.
 */
const getCourseSummary = async (userDetails) => {
  const { department, student_id, year } = userDetails;

  try {
    const subjects = await Subject.find({ department, year }).populate('assessments', '_id name');
    if (!subjects || subjects.length === 0) return [];

    const studentMarks = await Marks.findOne({ studentId: student_id })
                                    .populate('assessments.assessmentId', 'subjectName');

    // Default structure if no marks exist
    if (!studentMarks || !studentMarks.assessments) {
        return subjects.map(subject => ({
            subjectName: subject.name,
            totalAssessments: subject.assessments.length,
            attendedAssessments: 0,
            totalMarks: 0,
        }));
    }

    // THE FIX: Use a Set to store unique attended assessment IDs for each subject.
    const subjectStats = {};
    studentMarks.assessments.forEach(({ assessmentId, marks, statuses }) => {
        if (!assessmentId || !assessmentId.subjectName) return;

        const subjectName = assessmentId.subjectName;
        if (!subjectStats[subjectName]) {
            // Initialize with a Set for attended IDs and a marks counter
            subjectStats[subjectName] = { attendedAssessmentIds: new Set(), totalMarks: 0 };
        }

        // Add marks regardless
        subjectStats[subjectName].totalMarks += marks || 0;

        // Only add to the attended set if completed
        if (marks >= 0 || statuses === "completed") {
            // .add() will only add the ID if it's not already in the Set.
            subjectStats[subjectName].attendedAssessmentIds.add(assessmentId._id.toString());
        }
    });
    
    // Now, build the results using the size of the Set for the attended count.
    const results = subjects.map(subject => ({
        subjectName: subject.name,
        totalAssessments: subject.assessments.length,
        // THE FIX: The attended count is the size of the Set.
        attendedAssessments: subjectStats[subject.name]?.attendedAssessmentIds.size || 0,
        totalMarks: subjectStats[subject.name]?.totalMarks || 0
    }));
    
    return results;

  } catch (error) {
    console.error('Error in getCourseSummary service:', error);
    throw new Error('Failed to get course summary.');
  }
};



// --- getPerformanceData ---
const getPerformanceData = async (userDetails) => {
  const { student_id } = userDetails;

  try {
    // FIX: Use the correct 'Marks' model
    const marksData = await Marks.findOne({ studentId: student_id });

    // FIX: Add a robust check. This was the source of the "not iterable" error.
    if (!marksData || !Array.isArray(marksData.assessments) || marksData.assessments.length === 0) {
      console.warn(`No marks data or assessments array found for student: ${student_id}`);
      return []; // Return an empty array if there's nothing to iterate.
    }

    const monthlyData = {};
    
    // FIX: This loop is now safe.
    for (const markEntry of marksData.assessments) {
      const assessment = await Assessment.findById(markEntry.assessmentId);
      if (!assessment || !assessment.closeDate) continue;
      
      const month = moment(assessment.closeDate).format('YYYY-MM');
      if (!monthlyData[month]) {
        monthlyData[month] = { totalMarks: 0, count: 0 };
      }
      monthlyData[month].totalMarks += markEntry.marks || 0;
      monthlyData[month].count += 1;
    }

    // ... (rest of the function for formatting results)
    const results = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (const [month, data] of Object.entries(monthlyData)) {
        const averageMarks = data.count > 0 ? data.totalMarks / data.count : 0;
        const monthIndex = parseInt(month.split('-')[1], 10) - 1;
        results.push({
            month: monthNames[monthIndex],
            averageMarks: parseFloat(averageMarks.toFixed(2))
        });
    }

    return results;

  } catch (error) {
    console.error('Error in getPerformanceData service:', error);
    throw new Error('Failed to calculate performance data.');
  }
};

/**
 * Fetches assessments that are active today.
 * @returns {Promise<Array>} A promise that resolves to an array of assessment objects.
 */
const getTodaysAssessments = async () => {
  try {
    const today = moment().tz("Asia/Kolkata").startOf('day').toDate();
    const todayEnd = moment().tz("Asia/Kolkata").endOf('day').toDate();
    
    // Find assessments where today falls within the open/close date range
    const todayAssessments = await Assessment.find({
      openDate: { $lte: todayEnd },
      closeDate: { $gte: today }
    }).select('name _id'); // Only select fields needed by frontend
    
    return todayAssessments;

  } catch (error) {
    console.error('Error in getTodaysAssessments service:', error);
    throw new Error('Failed to fetch today\'s assessments.');
  }
};

/**
 * Fetches notifications that are currently active.
 * @returns {Promise<Array>} A promise that resolves to an array of notification objects.
 */
const getNotifications = async () => {
  try {
    const now = moment().tz("Asia/Kolkata");
    
    // Efficiently query for notifications that are currently active
    const activeNotifications = await ImportantNotification.find({
        openDateTime: { $lte: now.toDate() },
        closeDateTime: { $gte: now.toDate() }
    }).sort({ createdAt: -1 });

    return activeNotifications;
  } catch (error)
  {
    console.error('Error in getNotifications service:', error);
    throw new Error('Failed to fetch notifications.');
  }
};

/**
 * Fetches the setting for displaying answers/grades.
 * @returns {Promise<Object>} A promise that resolves to an object like { isEnabled: boolean }.
 */
const getDisplaySettings = async () => {
  try {
    let setting = await Settings.findOne({ settingName: 'DisplayAnswers' });
    if (!setting) {
      // If no setting exists, create a default one (e.g., enabled)
      setting = await new Settings({ settingName: 'DisplayAnswers', isEnabled: true }).save();
    }
    return { isEnabled: setting.isEnabled };

  } catch (error) {
    console.error('Error in getDisplaySettings service:', error);
    throw new Error('Failed to fetch display settings.');
  }
};

/**
 * Calculates today's attendance for a specific student by checking completed assessments.
 * @param {string} student_id - The ID of the student.
 * @returns {Promise<Object>} A promise resolving to an object with attendance stats.
 */
const getAttendance = async (student_id) => {
  try {
    const todayStart = moment().tz("Asia/Kolkata").startOf('day').toDate();
    const todayEnd = moment().tz("Asia/Kolkata").endOf('day').toDate();

    const todayAssessments = await Assessment.find({
      openDate: { $lte: todayEnd },
      closeDate: { $gte: todayStart }
    }).select('_id');

    const totalAssessmentsToday = todayAssessments.length;

    if (totalAssessmentsToday === 0) {
      // =========================== FIX IS HERE ===========================
      // If there are no assessments, the percentage should be 0, not 100.
      return { total: 0, attended: 0, percentage: '0.00' };
      // ========================= END OF FIX ==========================
    }

    const studentMarksDoc = await Marks.findOne({ studentId: student_id }).lean();
    
    if (!studentMarksDoc || !studentMarksDoc.assessments) {
        return { total: totalAssessmentsToday, attended: 0, percentage: '0.00' };
    }

    const todayAssessmentIdsStrings = todayAssessments.map(a => a._id.toString());
    
    const attendedMarksForToday = studentMarksDoc.assessments.filter(mark => 
        todayAssessmentIdsStrings.includes(mark.assessmentId.toString()) && mark.statuses === 'completed'
    );
    
    const uniqueAttendedIds = new Set(attendedMarksForToday.map(mark => mark.assessmentId.toString()));
    
    const attendedCount = uniqueAttendedIds.size;

    const percentage = totalAssessmentsToday > 0 ? (attendedCount / totalAssessmentsToday) * 100 : 0;
    
    return {
      total: totalAssessmentsToday,
      attended: attendedCount,
      percentage: percentage.toFixed(2),
    };

  } catch (error) {
    console.error('Error in getAttendance service:', error);
    throw new Error('Failed to calculate attendance.');
  }
};




// Export all service functions for the controller to use
module.exports = {
  getCourseSummary,
  getPerformanceData,
  getTodaysAssessments,
  getNotifications,
  getDisplaySettings,
  getAttendance,
};