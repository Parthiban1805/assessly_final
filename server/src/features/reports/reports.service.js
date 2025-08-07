// File: src/features/reports/reports.service.js
const ExcelJS = require('exceljs');
const { Marks } = require('../grades/grades.model');
const { Assessment } = require('../assessments/assessments.model');
const { Student } = require('../users/users.model');
const mongoose = require('mongoose'); // Import mongoose
const AssessmentResult = require('../results/results.model'); // Ensure this model is imported

/**
 * Fetches detailed student report data for a specific subject.
 * @param {string} subjectName - The name of the subject to report on.
 * @returns {Promise<Array>} An array of student report objects.
 */
const getStudentSubjectReportData = async (subjectName) => {
    // 1. Find all assessments for the given subject
    const assessments = await Assessment.find({ subjectName }).select('_id');
    if (assessments.length === 0) {
        return [];
    }
    const assessmentIds = assessments.map(a => a._id);

    // 2. Find all student mark records that contain any of these assessments.
    //    Ensure there is NO .populate() call here.
    const studentMarks = await Marks.find({ 'assessments.assessmentId': { $in: assessmentIds } })
                                    .select('studentId assessments');

    if (studentMarks.length === 0) {
        return [];
    }

    // 3. Get all relevant student details in one separate, efficient query
    const studentIds = studentMarks.map(m => m.studentId);
    const students = await Student.find({ student_id: { $in: studentIds } })
                                  .select('name student_id year department');
    const studentMap = new Map(students.map(s => [s.student_id, s]));

    // 4. Process and combine the data in JavaScript
    const reportData = studentMarks.map(markRecord => {
        const studentDetail = studentMap.get(markRecord.studentId);
        if (!studentDetail) return null;

        const subjectAssessments = markRecord.assessments.filter(asm =>
            assessmentIds.some(id => id.equals(asm.assessmentId))
        );

        const stats = subjectAssessments.reduce((acc, current) => {
            acc.totalAssessments += 1;
            if (current.statuses === 'completed') {
                acc.presentAssessments += 1;
                acc.totalMarks += current.marks || 0;
            }
            return acc;
        }, { totalAssessments: 0, presentAssessments: 0, totalMarks: 0 });

        return {
            name: studentDetail.name,
            studentId: studentDetail.student_id,
            year: studentDetail.year,
            department: studentDetail.department,
            subjects: [{
                subjectName,
                totalAssessments: stats.totalAssessments,
                presentAssessments: stats.presentAssessments,
                totalMarks: stats.totalMarks,
            }]
        };
    }).filter(Boolean);

    return reportData;
};
/**
 * Generates an Excel file buffer from the report data.
 * @param {Array} data - The report data from getSubjectPerformanceData.
 * @returns {Promise<Buffer>} A buffer containing the Excel file.
 */
const generatePerformanceExcel = async (data) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Student Performance');

    worksheet.columns = [
        { header: 'Student ID', key: 'studentId', width: 20 },
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Year', key: 'year', width: 15 },
        { header: 'Department', key: 'department', width: 20 },
        { header: 'Total Assessments', key: 'totalAssessments', width: 20 },
        { header: 'Completed', key: 'presentAssessments', width: 15 },
        { header: 'Total Marks', key: 'totalMarks', width: 15 },
    ];
    worksheet.getRow(1).font = { bold: true }; // Make header bold

    // Add data rows
    data.forEach(student => {
        // Assuming one subject per report for this specific download
        const subjectInfo = student.subjects[0];
        worksheet.addRow({
            studentId: student.studentId,
            name: student.name,
            year: student.year,
            department: student.department,
            totalAssessments: subjectInfo.totalAssessments,
            presentAssessments: subjectInfo.presentAssessments,
            totalMarks: subjectInfo.totalMarks,
        });
    });

    return await workbook.xlsx.writeBuffer();
};
/**
 * Generates a date-wise assessment report for a specific teacher.
 * This is an optimized version to avoid N+1 query problems.
 * @param {object} teacherDetails - The user details for the teacher from the JWT.
 * @returns {Promise<Array>} A promise that resolves to an array of assessment reports.
 */
const generateTeacherReport = async (teacherDetails) => {
    const { teacher_id, subjects, department } = teacherDetails;
    
    // 1. Fetch all assessments for the teacher in one go.
    const assessments = await Assessment.find({
        teacher_id: teacher_id,
        subjectName: { $in: Array.isArray(subjects) ? subjects : [subjects] },
        department,
    }).lean(); // Use .lean() for faster, plain JS objects

    if (!assessments.length) return [];

    const assessmentIds = assessments.map(a => a._id);

    // 2. Fetch all marks data for these assessments.
    const marksData = await Marks.find({
        'assessments.assessmentId': { $in: assessmentIds },
    }).lean();

    // 3. Collect all unique student IDs from the marks data.
    const studentIds = [...new Set(marksData.map(m => String(m.studentId).trim()))];
    
    // 4. Fetch all relevant student details in a single query.
    const students = await Student.find({ student_id: { $in: studentIds } }).lean();
    const studentMap = new Map(students.map(s => [s.student_id, s.name]));

    // 5. Aggregate the data in memory (much faster than repeated DB calls).
    const report = assessments.map(assessment => {
        const studentMarks = [];
        
        marksData.forEach(markEntry => {
            const match = markEntry.assessments.find(a => 
                a.assessmentId.toString() === assessment._id.toString()
            );

            if (match) {
                const studentId = String(markEntry.studentId).trim();
                studentMarks.push({
                    studentId: studentId,
                    studentName: studentMap.get(studentId) || `Unknown (ID: ${studentId})`,
                    marks: match.marks,
                    status: match.statuses,
                    locked: match.locked,
                });
            }
        });
        
        return {
            ...assessment,
            studentMarks,
        };
    });

    return report;
};
/**
 * Finds the student with the highest total marks in a specific subject.
 * @param {string} subjectName - The name of the subject.
 * @returns {Promise<object|null>} The report data for the top student, or null if none found.
 */
const getTopStudentBySubject = async (subjectName) => {
    // We can reuse the existing function to get all data
    const allStudentData = await getStudentSubjectReportData(subjectName);

    if (!allStudentData || allStudentData.length === 0) {
        return null;
    }

    // Find the student with the highest marks
    const topStudent = allStudentData.reduce((max, student) => {
        const currentMarks = student.subjects[0]?.totalMarks || 0;
        const maxMarks = max.subjects[0]?.totalMarks || 0;
        return currentMarks > maxMarks ? student : max;
    }, allStudentData[0]);

    return topStudent;
};

/**
 * Finds students who completed an assessment on a specific date for a given subject.
 * @param {string} subjectName - The name of the subject.
 *param {string} dateString - The date in 'YYYY-MM-DD' format.
 * @returns {Promise<Array>} A list of student names.
 */
const getCompletedAssessmentsByDate = async (subjectName, dateString) => {
    // 1. Find all assessments for the subject
    const subjectAssessments = await Assessment.find({ subjectName }).select('_id').lean();
    if (subjectAssessments.length === 0) return [];
    const subjectAssessmentIds = subjectAssessments.map(a => a._id);

    // 2. Define the date range for the given day
    const startDate = new Date(dateString);
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(dateString);
    endDate.setUTCHours(23, 59, 59, 999);

    // 3. Find AssessmentResult documents that match the criteria
    // We will use the AssessmentResult model as it stores completion timestamps.
    const AssessmentResult = require('../results/results.model'); // Assuming this is the path
    
    const results = await AssessmentResult.find({
        assessmentId: { $in: subjectAssessmentIds },
        createdAt: { // The 'createdAt' in AssessmentResult marks the completion time
            $gte: startDate,
            $lt: endDate,
        }
    }).populate({ // Populate student details from the Student collection
        path: 'studentId', 
        model: 'Student', // Specify the model to use for population
        select: 'name', // We only need the name
        foreignField: 'student_id', // The field in the Student model to match against
        localField: 'studentId' // The field in the AssessmentResult model
    }).lean();
    
    // 4. Extract and return unique student names
    const studentNames = [...new Set(results.map(r => r.studentId?.name).filter(Boolean))];
    return studentNames;
};


/**
 * Gets statistics about assessments created on a specific date for a teacher.
 * @param {string} dateString - The date in 'YYYY-MM-DD' format.
 * @param {object} teacherDetails - The teacher's user details from JWT.
 * @returns {Promise<object>} An object with assessment statistics.
 */
const getAssessmentStatsByCreationDate = async (dateString, teacherDetails) => {
    // 1. Define the date range
    const startDate = new Date(dateString);
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(dateString);
    endDate.setUTCHours(23, 59, 59, 999);

    // 2. Find assessments created by this teacher within the date range
    const assessments = await Assessment.find({
        teacher_id: teacherDetails.teacher_id,
        subjectName: { $in: Array.isArray(teacherDetails.subjects) ? teacherDetails.subjects : [teacherDetails.subjects] },
        createdAt: { // 'createdAt' on the Assessment model is the creation date
            $gte: startDate,
            $lt: endDate,
        }
    }).lean();

    if (assessments.length === 0) {
        return { assessmentsCreated: 0, totalSubmissions: 0, assessmentNames: [] };
    }

    const assessmentIds = assessments.map(a => a._id);

    // 3. Count total submissions for these specific assessments
    const marksData = await Marks.find({ 'assessments.assessmentId': { $in: assessmentIds } }).lean();
    const totalSubmissions = marksData.reduce((sum, entry) => {
        return sum + entry.assessments.filter(a => assessmentIds.some(id => id.equals(a.assessmentId))).length;
    }, 0);
    
    return {
        assessmentsCreated: assessments.length,
        totalSubmissions,
        assessmentNames: assessments.map(a => a.name),
    };
};

/**
 * Calculates overall statistics for a given subject.
 * @param {string} subjectName - The name of the subject.
 * @returns {Promise<object>} An object with total marks, student count, etc.
 */
const getOverallSubjectStats = async (subjectName) => {
    // We can reuse the existing function which already calculates this!
    const reportData = await getStudentSubjectReportData(subjectName);

    if (reportData.length === 0) {
        return {
            totalStudents: 0,
            totalMarksSum: 0,
            totalAssessmentsCompleted: 0,
        };
    }

    const stats = reportData.reduce((acc, student) => {
        const subjectInfo = student.subjects[0];
        acc.totalMarksSum += subjectInfo.totalMarks;
        acc.totalAssessmentsCompleted += subjectInfo.presentAssessments;
        return acc;
    }, { totalMarksSum: 0, totalAssessmentsCompleted: 0 });

    return {
        subjectName,
        totalStudents: reportData.length,
        totalMarksSum: stats.totalMarksSum,
        totalAssessmentsCompleted: stats.totalAssessmentsCompleted,
    };
};

/**
 * Counts how many assessments were COMPLETED on a specific date for a given subject.
 * @param {string} subjectName - The name of the subject.
 * @param {string} dateString - The date in 'YYYY-MM-DD' format.
 * @returns {Promise<object>} An object with the count of completed assessments.
 */
const countCompletedAssessmentsByDate = async (subjectName, dateString) => {
    // 1. Find all assessments for the subject to filter by
    const subjectAssessments = await Assessment.find({ subjectName }).select('_id').lean();
    if (subjectAssessments.length === 0) {
        return { completedCount: 0, distinctStudents: 0 };
    }
    const subjectAssessmentIds = subjectAssessments.map(a => a._id);

    // 2. Define the date range for the given day
    const startDate = new Date(dateString);
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(dateString);
    endDate.setUTCHours(23, 59, 59, 999);

    // 3. Find AssessmentResult documents that match the criteria
    // The 'createdAt' field in AssessmentResult marks the completion time.
    const results = await AssessmentResult.find({
        assessmentId: { $in: subjectAssessmentIds },
        createdAt: {
            $gte: startDate,
            $lt: endDate,
        }
    }).lean();

    // 4. Calculate the stats
    const distinctStudents = new Set(results.map(r => r.studentId)).size;

    return {
        completedCount: results.length, // Total number of completions
        distinctStudents: distinctStudents, // Number of unique students who completed
    };
};
/**
 * Gets DETAILED performance reports for students who completed assessments on a specific date.
 * @param {string} subjectName - The name of the subject.
 * @param {string} dateString - The date in 'YYYY-MM-DD' format.
 * @returns {Promise<Array>} An array of detailed report objects for each completion.
 */
const getDetailedReportByCompletionDate = async (subjectName, dateString) => {
    // 1. Define the date range
    const startDate = new Date(dateString);
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(dateString);
    endDate.setUTCHours(23, 59, 59, 999);

    // 2. Find all assessments for the subject
    const subjectAssessments = await Assessment.find({ subjectName }).select('_id name').lean();
    if (subjectAssessments.length === 0) return [];
    const subjectAssessmentIds = subjectAssessments.map(a => a._id);
    const assessmentNameMap = new Map(subjectAssessments.map(a => [a._id.toString(), a.name]));

    // 3. Find all AssessmentResult documents within the date range for the subject
    const results = await AssessmentResult.find({
        assessmentId: { $in: subjectAssessmentIds },
        createdAt: { $gte: startDate, $lt: endDate }
    }).lean();

    if (results.length === 0) return [];

    // 4. Get all relevant student details in one query
    const studentIds = [...new Set(results.map(r => r.studentId))];
    const students = await Student.find({ student_id: { $in: studentIds } }).select('name student_id').lean();
    const studentMap = new Map(students.map(s => [s.student_id, s.name]));

    // 5. Format the data into a detailed report structure
    const detailedReport = results.map(result => {
        const studentName = studentMap.get(result.studentId);
        if (!studentName) return null;

        return {
            studentName: studentName,
            rollNo: result.studentId,
            subject: subjectName,
            assessment: assessmentNameMap.get(result.assessmentId.toString()) || 'Unknown Assessment',
            marks: result.totalMarks,
            // You can add more details here if needed, like performance tier
            performance: result.totalMarks > 50 ? 'Good' : 'Poor', // Example logic
        };
    }).filter(Boolean); // Filter out any null entries

    return detailedReport;
};
/**
 * CATEGORY 1: Gets a ranked list of students by performance.
 * @param {string} subjectName - The subject to report on.
 * @param {'ascending' | 'descending'} rankOrder - Sort by lowest or highest marks.
 * @param {number} limit - The number of students to return.
 * @returns {Promise<Array>} A ranked list of students with their total marks.
 */
const getRankedStudentsByPerformance = async (subjectName, rankOrder, limit) => {
    // We can reuse the main report data function, which is efficient.
    const allStudentData = await getStudentSubjectReportData(subjectName);
    if (!allStudentData || allStudentData.length === 0) return [];

    // Sort the students based on their total marks for the subject.
    allStudentData.sort((a, b) => {
        const marksA = a.subjects[0]?.totalMarks || 0;
        const marksB = b.subjects[0]?.totalMarks || 0;
        // For 'ascending' (bottom performers), sort from lowest to highest.
        return rankOrder === 'ascending' ? marksA - marksB : marksB - marksA;
    });

    // Return the ranked list, sliced to the requested limit.
    return allStudentData.slice(0, limit).map(student => ({
        name: student.name,
        studentId: student.studentId,
        totalMarks: student.subjects[0]?.totalMarks || 0
    }));
};

/**
 * CATEGORY 1: Filters students based on their score in a single, named assessment.
 * @param {string} subjectName - The teacher's subject to scope the search.
 * @param {string} assessmentName - The name of the assessment.
 * @param {'above' | 'below'} condition - The comparison condition.
 * @param {number} mark - The threshold mark.
 * @returns {Promise<Array>} A list of students who meet the criteria.
 */
const getStudentsByPerformanceInAssessment = async (subjectName, assessmentName, condition, mark) => {
    // 1. Find the specific assessment by name to get its ID.
    const assessment = await Assessment.findOne({ name: { $regex: new RegExp(`^${assessmentName}$`, 'i') }, subjectName }).select('_id').lean();
    if (!assessment) throw new Error(`Assessment named "${assessmentName}" not found for this subject.`);
    
    // 2. Build the query condition for the marks.
    const markCondition = condition === 'above' ? { $gt: mark } : { $lt: mark };

    // 3. Find all mark entries that match the criteria.
    const matchingMarks = await Marks.find({
        'assessments': {
            $elemMatch: {
                assessmentId: assessment._id,
                marks: markCondition
            }
        }
    }).select('studentId assessments.$').lean(); // Use .$ to get only the matching sub-document

    if (matchingMarks.length === 0) return [];

    // 4. Get the names for the found student IDs.
    const studentIds = matchingMarks.map(m => m.studentId);
    const students = await Student.find({ student_id: { $in: studentIds } }).select('name student_id').lean();
    const studentMap = new Map(students.map(s => [s.student_id, s.name]));

    // 5. Format the final result.
    return matchingMarks.map(m => ({
        name: studentMap.get(m.studentId) || m.studentId,
        studentId: m.studentId,
        assessmentName: assessmentName,
        marks: m.assessments[0].marks // We only fetched the one matching assessment
    }));
};

/**
 * CATEGORY 2: Gets a detailed progress report for a single student.
 * @param {string} subjectName - The subject to scope the search.
 * @param {string} studentId - The unique ID of the student.
 * @returns {Promise<object>} A student progress summary.
 */
const getSingleStudentProgressReport = async (subjectName, studentId) => {
    // 1. Find all assessments for the entire subject.
    const allSubjectAssessments = await Assessment.find({ subjectName }).select('name').lean();
    if (allSubjectAssessments.length === 0) throw new Error(`No assessments found for subject ${subjectName}.`);

    // 2. Find the student's mark document.
    const studentMarks = await Marks.findOne({ studentId }).populate('assessments.assessmentId', 'name').lean();
    const student = await Student.findOne({ student_id: studentId }).select('name').lean();
    if (!student) throw new Error(`Student with ID ${studentId} not found.`);

    let attendedCount = 0;
    const assessmentBreakdown = allSubjectAssessments.map(subjectAsm => {
        const completedAsm = studentMarks?.assessments.find(
            sa => sa.assessmentId?.name === subjectAsm.name
        );
        if (completedAsm) {
            attendedCount++;
            return {
                assessmentName: subjectAsm.name,
                status: 'Completed',
                marks: completedAsm.marks
            };
        } else {
            return {
                assessmentName: subjectAsm.name,
                status: 'Missed / Not Started',
                marks: 'N/A'
            };
        }
    });

    return {
        studentName: student.name,
        totalAssessmentsForSubject: allSubjectAssessments.length,
        assessmentsAttended: attendedCount,
        assessmentsMissed: allSubjectAssessments.length - attendedCount,
        breakdown: assessmentBreakdown
    };
};

/**
 * CATEGORY 2: Compares a student's performance across two specified assessments.
 * @param {string} studentId - The unique ID of the student.
 * @param {Array<string>} assessmentNames - An array containing the names of two assessments.
 * @returns {Promise<object>} A comparison object.
 */
const compareStudentPerformanceAcrossAssessments = async (studentId, assessmentNames) => {
    if (assessmentNames.length !== 2) throw new Error("Please provide exactly two assessment names to compare.");
    
    // 1. Find the student's marks.
    const studentMarks = await Marks.findOne({ studentId }).populate('assessments.assessmentId', 'name').lean();
    if (!studentMarks) throw new Error(`No marks found for student ID ${studentId}.`);

    const student = await Student.findOne({ student_id: studentId }).select('name').lean();
    if (!student) throw new Error(`Student with ID ${studentId} not found.`);

    // 2. Find the marks for each of the requested assessments.
    const results = assessmentNames.map(name => {
        const found = studentMarks.assessments.find(asm => asm.assessmentId?.name.toLowerCase() === name.toLowerCase());
        return {
            assessmentName: name,
            marks: found ? found.marks : 'N/A'
        };
    });

    return {
        studentName: student.name,
        comparison: results
    };
};
/**
 * Finds all student submissions that were locked due to violations.
 * @param {string} subjectName - The subject to scope the search.
 * @param {string|null} assessmentName - Optional: The name of a specific assessment to filter by.
 * @returns {Promise<Array>} A list of locked submissions with student and assessment details.
 */
const getLockedOutSubmissions = async (subjectName, assessmentName = null) => {
    // 1. Define the base filter for the 'Marks' collection.
    const queryFilter = {
        'assessments.locked': true
    };

    // 2. If a specific assessment is requested, find its ID and add it to the filter.
    let targetAssessmentIds = [];
    if (assessmentName) {
        const assessment = await Assessment.findOne({ name: { $regex: new RegExp(`^${assessmentName}$`, 'i') }, subjectName }).select('_id').lean();
        if (!assessment) throw new Error(`Assessment named "${assessmentName}" not found.`);
        targetAssessmentIds = [assessment._id];
        queryFilter['assessments.assessmentId'] = assessment._id;
    } else {
        // Otherwise, get all assessment IDs for the subject.
        const allAssessments = await Assessment.find({ subjectName }).select('_id').lean();
        targetAssessmentIds = allAssessments.map(a => a._id);
        queryFilter['assessments.assessmentId'] = { $in: targetAssessmentIds };
    }
    
    // 3. Find all 'Marks' documents that have a locked assessment matching the criteria.
    const lockedMarks = await Marks.find(queryFilter).populate('assessments.assessmentId', 'name').lean();

    if (lockedMarks.length === 0) return [];
    
    // 4. Get details for all relevant students in a single query.
    const studentIds = lockedMarks.map(m => m.studentId);
    const students = await Student.find({ student_id: { $in: studentIds } }).select('name student_id').lean();
    const studentMap = new Map(students.map(s => [s.student_id, s.name]));

    // 5. Process the results to create a clean report.
    const report = [];
    lockedMarks.forEach(markDoc => {
        markDoc.assessments.forEach(asm => {
            // Check if the assessment is locked AND is one of the ones we're looking for.
            if (asm.locked && targetAssessmentIds.some(id => id.equals(asm.assessmentId._id))) {
                report.push({
                    studentName: studentMap.get(markDoc.studentId) || markDoc.studentId,
                    studentId: markDoc.studentId,
                    assessmentName: asm.assessmentId.name,
                    status: 'Locked'
                });
            }
        });
    });
    
    return report;
};

/**
 * Finds the assessment with the highest number of missed submissions (absentees).
 * @param {string} subjectName - The subject to analyze.
 * @param {string} department - The department of the students.
 * @param {number|string} year - The year of the students.
 * @returns {Promise<object>} The assessment with the most absentees.
 */
const getAssessmentWithMostAbsentees = async (subjectName, department, year) => {
    // 1. Get the total number of students who should be taking the assessments.
    const totalStudentCount = await Student.countDocuments({ department, year });
    if (totalStudentCount === 0) throw new Error("No students found for this department and year.");

    // 2. Get all assessments for the subject.
    const allAssessments = await Assessment.find({ subjectName, department, year }).select('_id name').lean();
    if (allAssessments.length === 0) return { message: "No assessments found for this subject." };

    let maxAbsentees = -1;
    let mostMissedAssessment = null;

    // 3. Loop through each assessment to calculate absenteeism.
    for (const assessment of allAssessments) {
        // Count how many distinct students submitted this assessment.
        const completedCount = await AssessmentResult.distinct('studentId', { assessmentId: assessment._id });
        const absenteeCount = totalStudentCount - completedCount;

        if (absenteeCount > maxAbsentees) {
            maxAbsentees = absenteeCount;
            mostMissedAssessment = {
                assessmentName: assessment.name,
                totalStudents,
                studentsWhoCompleted: completedCount,
                absenteeCount,
            };
        }
    }
    
    return mostMissedAssessment;
};


module.exports = {
    getStudentSubjectReportData,
    generatePerformanceExcel,
    generateTeacherReport,
     getTopStudentBySubject,
         getCompletedAssessmentsByDate,
    getAssessmentStatsByCreationDate, 
    getOverallSubjectStats,
    countCompletedAssessmentsByDate,
    getDetailedReportByCompletionDate,
     getDetailedReportByCompletionDate,
    getRankedStudentsByPerformance,                
    getStudentsByPerformanceInAssessment,       
    getSingleStudentProgressReport,               
    compareStudentPerformanceAcrossAssessments,
    getLockedOutSubmissions,           
    getAssessmentWithMostAbsentees,   
};