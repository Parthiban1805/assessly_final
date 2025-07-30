const { Student } = require('../users/users.model');
const { Teacher } = require('../users/users.model');
const { Marks } = require('../grades/grades.model');
const { Assessment } = require('../assessments/assessments.model');
const ImportantNotification = require('../notifications/notifications.model');
const AssessmentResult = require('../results/results.model');

/**
 * Fetches the initial data payload required for the Admin Dashboard page.
 * This includes a list of all students and all teachers with minimal details.
 * @returns {Promise<object>} An object containing `{ students: Array, teachers: Array }`.
 */
const getDashboardData = async () => {
    // Fetch both lists in parallel to minimize wait time.
    const [students, teachers] = await Promise.all([
        // For students, select the fields needed for the list view.
        Student.find({}, 'student_id email year name photo_url department').lean(),

        // For teachers, select the fields needed for the list view.
        Teacher.find({}, 'teacher_id email year name photo_url department').lean()
    ]);

    // The service returns a clean data object, which the controller will send as JSON.
    return { students, teachers };
};
/**
 * CATEGORY 1: Ranks all subjects by average student marks.
 * @returns {Promise<Array>} A ranked list of subjects.
 */
const getCrossSubjectPerformanceRanking = async () => {
    const ranking = await Marks.aggregate([
        // Deconstruct the assessments array into individual documents
        { $unwind: '$assessments' },
        // Join with the assessments collection to get the subject name
        {
            $lookup: {
                from: 'ass1', // The actual collection name for assessments
                localField: 'assessments.assessmentId',
                foreignField: '_id',
                as: 'assessmentDetails'
            }
        },
        // We only need the first element of the lookup result
        { $unwind: '$assessmentDetails' },
        // Group by subject name and calculate the average marks
        {
            $group: {
                _id: '$assessmentDetails.subjectName',
                averageScore: { $avg: '$assessments.marks' },
                totalSubmissions: { $sum: 1 }
            }
        },
        // Sort by the average score in descending order
        { $sort: { averageScore: -1 } },
        // Project to a cleaner output format
        {
            $project: {
                _id: 0,
                subjectName: '$_id',
                averageScore: { $round: ['$averageScore', 2] },
                totalSubmissions: 1,
            }
        }
    ]);

    return ranking;
};

/**
 * CATEGORY 1: Finds teachers who have not created an assessment in a given time frame.
 * @param {number} daysInactive - The number of days to look back.
 * @returns {Promise<Array>} A list of inactive teachers.
 */
const findInactiveTeachers = async (daysInactive) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

    // 1. Find all teacher IDs who HAVE been active
    const activeTeacherIds = await Assessment.distinct('teacher_id', {
        createdAt: { $gte: cutoffDate }
    });
    
    // 2. Find all teachers who are NOT in the active list
    const inactiveTeachers = await Teacher.find(
        { teacher_id: { $nin: activeTeacherIds } },
        'teacher_id name email'
    ).lean();

    return inactiveTeachers;
};

/**
 * CATEGORY 2: Finds accounts with duplicate email addresses across collections.
 * @returns {Promise<Array>} A list of emails that are duplicated.
 */
const findAccountsWithDuplicateEmails = async () => {
    // We need to query both collections and combine the results
    const studentEmailCounts = await Student.aggregate([
        { $group: { _id: '$email', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }
    ]);

    const teacherEmailCounts = await Teacher.aggregate([
        { $group: { _id: '$email', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }
    ]);
    
    // In a more complex scenario (checking duplicates *between* students and teachers),
    // you would combine all emails into one array and find duplicates in JS.
    // For now, this finds duplicates within each user type.
    const duplicates = {
        students: studentEmailCounts.map(d => ({ email: d._id, count: d.count })),
        teachers: teacherEmailCounts.map(d => ({ email: d._id, count: d.count })),
    };
    
    return duplicates;
};

/**
 * CATEGORY 3: Deletes all notifications that expired before a given date.
 * @param {string} expiryDate - The cutoff date in YYYY-MM-DD format.
 * @returns {Promise<object>} A result object with the count of deleted notifications.
 */
const bulkDeleteExpiredNotifications = async (expiryDate) => {
    const cutoffDate = new Date(expiryDate);
    if (isNaN(cutoffDate)) {
        throw new Error("Invalid date format provided.");
    }

    const result = await ImportantNotification.deleteMany({
        closeDateTime: { $lt: cutoffDate }
    });

    return { deletedCount: result.deletedCount };
};

/**
 * Finds students who have not completed any assessment in a given time frame.
 * @param {number} daysInactive - The number of days to look back.
 * @returns {Promise<Array>} A list of inactive students.
 */
const findInactiveStudents = async (daysInactive) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

    // 1. Find all distinct student IDs who HAVE been active
    // We use AssessmentResult because its `createdAt` is the completion timestamp.
    const activeStudentIds = await AssessmentResult.distinct('studentId', {
        createdAt: { $gte: cutoffDate }
    });
    
    // 2. Find all students who are NOT in the active list
    const inactiveStudents = await Student.find(
        { student_id: { $nin: activeStudentIds } },
        'student_id name email department' // Select fields to return
    ).lean();

    return inactiveStudents;
};

module.exports = {
    getDashboardData,
    getCrossSubjectPerformanceRanking,
    findInactiveTeachers,
    findAccountsWithDuplicateEmails,
    bulkDeleteExpiredNotifications,
    findInactiveStudents

};