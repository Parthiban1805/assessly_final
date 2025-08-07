const Groq = require('groq-sdk');
require('dotenv').config();
const reportService = require('./reports.service');
const assessmentService = require('../assessments/assessments.service');

const groq = new Groq({
    // Make sure your .env file has this key. Using a fallback for safety.
    apiKey: process.env.GROQ_API_KEY_chatbot || process.env.GROQ_API_KEY,
});

// --- Existing Controller Functions (No changes needed) ---

const getSubjectPerformanceReport = async (req, res) => {
    try {
        const subjectName = req.user.userDetails.subjects;
        if (!subjectName) {
            return res.status(400).json({ message: "No subject assigned to this teacher's profile." });
        }
        const data = await reportService.getStudentSubjectReportData(subjectName);
        res.status(200).json(data);
    } catch (error) {
        console.error('Error getting subject performance report:', error);
        res.status(500).json({ message: 'Server error while generating report.' });
    }
};

const downloadSubjectPerformanceReport = async (req, res) => {
    try {
        const subjectName = req.user.userDetails.subjects;
        if (!subjectName) {
            return res.status(400).json({ message: "No subject assigned to this teacher's profile." });
        }
        const data = await reportService.getStudentSubjectReportData(subjectName);
        const excelBuffer = await reportService.generatePerformanceExcel(data);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=performance_report_${subjectName.replace(/ /g, '_')}.xlsx`);
        res.send(excelBuffer);
    } catch (error) {
        console.error('Error downloading subject performance report:', error);
        res.status(500).json({ message: 'Server error while generating Excel file.' });
    }
};

const getTeacherDateWiseReport = async (req, res) => {
    try {
        const { userDetails } = req.user;
        const reportData = await reportService.generateTeacherReport(userDetails);
        res.status(200).json(reportData);
    } catch (error) {
        console.error('Error generating teacher report:', error);
        res.status(500).json({ message: 'Server error while generating report.' });
    }
};


// --- Corrected and Optimized Chatbot Controller ---

const handleChatbotQuery = async (req, res) => {
    const { query } = req.body;
    const { userDetails } = req.user;
    const teacherSubject = userDetails.subjects; // The one true subject

    if (!query) {
        return res.status(400).json({ message: "Query is required." });
    }
    if (!teacherSubject) {
        return res.status(400).json({ message: "No subject assigned to this teacher's profile." });
    }

    // --- Layer 2: Security Firewall ---
    const lowerCaseQuery = query.toLowerCase();
    const forbiddenSubjects = ['physics', 'chemistry', 'biology', 'history', 'math'];
    const containsForbiddenSubject = forbiddenSubjects.some(sub =>
        lowerCaseQuery.includes(sub) && !teacherSubject.toLowerCase().includes(sub)
    );
    if (containsForbiddenSubject) {
        return res.json({ reply: `I can only provide information about your assigned subject, which is "${teacherSubject}". I do not have access to data for other subjects.` });
    }

    // --- Real-time Context Injection ---
    const today = new Date();
    const currentYear = today.getFullYear();
    const todayString = today.toISOString().split('T')[0];

    // --- Layer 1: Strong, Persona-based System Prompt ---
    const systemPrompt = `You are a specialized data bot for a teacher. Your ONLY function is to provide information about the subject "${teacherSubject}".
- Your knowledge is STRICTLY LIMITED to "${teacherSubject}".
- **CRITICAL RULE**: If a user asks about ANY other academic subject or any general knowledge question, you MUST respond with: "I am only able to provide information for the subject: ${teacherSubject}." DO NOT attempt to answer or use any tools.
- The current date is ${todayString}. Assume the current year (${currentYear}) if the user doesn't specify one.
- Use your tools to answer questions about "${teacherSubject}".`;

    // --- FINAL, UNAMBIGUOUS TOOLSET ---
    const tools = [
        {
            type: 'function',
            function: {
                name: 'get_student_details_by_completion_date',
                description: 'Gets a DETAILED, table-like report of student performance for assessments COMPLETED on a specific date. Use this when the user asks for "details" of students who attended or completed on a date.',
                parameters: { type: 'object', properties: { date: { type: 'string', description: 'The date to search for, in YYYY-MM-DD format.' } }, required: ['date'] },
            },
        },
        {
            type: 'function',
            function: {
                name: 'get_student_names_by_completion_date',
                description: 'Gets a simple LIST of STUDENT NAMES who COMPLETED an assessment on a specific date. Use this only if the user asks "who" or for a "list of names".',
                parameters: { type: 'object', properties: { date: { type: 'string', description: 'The date to search for, in YYYY-MM-DD format.' } }, required: ['date'] },
            },
        },
        {
            type: 'function',
            function: {
                name: 'get_assessment_completion_stats_by_date',
                description: 'Gets the COUNT of how many assessments were COMPLETED on a specific date. Use this only if the user asks "how many".',
                parameters: { type: 'object', properties: { date: { type: 'string', description: 'The date to search for, in YYYY-MM-DD format.' } }, required: ['date'] },
            },
        },
        {
            type: 'function',
            function: {
                name: 'get_assessment_creation_stats_by_date',
                description: 'Get statistics about assessments that the teacher CREATED on a specific date. Use only when the user explicitly asks what was "created" or "made".',
                parameters: { type: 'object', properties: { date: { type: 'string', description: 'The date to search for, in YYYY-MM-DD format.' } }, required: ['date'] },
            },
        },
        {
            type: 'function',
            function: {
                name: 'get_overall_subject_stats',
                description: 'Calculates aggregate statistics like the sum of all marks for all students in the subject.',
                parameters: { type: 'object', properties: {} },
            },
        },
        {
            type: 'function',
            function: {
                name: 'get_top_student_in_subject',
                description: `Finds the student with the highest marks in ${teacherSubject}.`
            }
        },
        {
            type: 'function',
            function: {
                name: 'get_full_subject_report',
                description: `Get a full performance report for all students in ${teacherSubject}.`
            }
        },
         {
            type: 'function',
            function: {
                name: 'get_ranked_students_by_performance',
                description: "Gets a ranked list of students based on their total marks, either top performers or bottom performers.",
                parameters: { type: 'object', properties: { rank_order: { type: 'string', enum: ['ascending', 'descending'] }, limit: { type: 'number', default: 5 } }, required: ['rank_order'] },
            },
        },
        {
            type: 'function',
            function: {
                name: 'get_students_by_performance_in_assessment',
                description: "Filters students who scored above or below a certain mark in a single, specific assessment.",
                parameters: { type: 'object', properties: { assessment_name: { type: 'string' }, condition: { type: 'string', enum: ['above', 'below'] }, mark: { type: 'number' } }, required: ['assessment_name', 'condition', 'mark'] },
            },
        },
        // --- Category 2 Tools ---
        {
            type: 'function',
            function: {
                name: 'get_single_student_progress_report',
                description: "Provides a detailed progress and attendance report for a single student across all assessments.",
                // NOTE: In a real app, this would use a search tool first to get the ID from a name.
                // For now, we assume an ID might be passed or the LLM can extract it.
                parameters: { type: 'object', properties: { student_id: { type: 'string' } }, required: ['student_id'] },
            },
        },
        {
            type: 'function',
            function: {
                name: 'compare_student_performance_across_assessments',
                description: "Compares a single student's marks across two specific assessments.",
                parameters: { type: 'object', properties: { student_id: { type: 'string' }, assessment_names: { type: 'array', items: { type: 'string' } } }, required: ['student_id', 'assessment_names'] },
            },
        },
         {
            type: 'function',
            function: {
                name: 'get_locked_out_submissions',
                description: "Retrieves a list of all student submissions that were locked due to violations for the teacher's subject.",
                parameters: { type: 'object', properties: { assessment_name: { type: 'string', description: 'Optional: Filter by a specific assessment name.' } } },
            },
        },
        {
            type: 'function',
            function: {
                name: 'get_assessment_with_most_absentees',
                description: "Analyzes all assessments in the subject and identifies which one has the highest number of students who did not complete it.",
                parameters: { type: 'object', properties: {} },
            },
        },
        // --- Category 5 Tool (Write Action) ---
        {
            type: 'function',
            function: {
                name: 'duplicate_assessment',
                description: "Creates a copy of an existing assessment and its questions, with a new name and dates. This is a WRITE action.",
                parameters: {
                    type: 'object',
                    properties: {
                        source_assessment_name: { type: 'string' },
                        new_assessment_name: { type: 'string' },
                        new_open_date: { type: 'string', description: 'YYYY-MM-DD' },
                        new_open_time: { type: 'string', description: 'HH:MM' },
                        new_close_date: { type: 'string', description: 'YYYY-MM-DD' },
                        new_close_time: { type: 'string', description: 'HH:MM' },
                    },
                    required: ['source_assessment_name', 'new_assessment_name', 'new_open_date', 'new_open_time', 'new_close_date', 'new_close_time'],
                },
            },
        },
    ];

    try {
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: query, }
        ];

        const chatCompletion = await groq.chat.completions.create({
            messages,
            model: 'llama3-70b-8192',
            tools,
            tool_choice: 'auto',
            temperature: 0.1,
        });

        const responseMessage = chatCompletion.choices[0].message;

        if (responseMessage.tool_calls) {
            const toolCall = responseMessage.tool_calls[0];
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);
            let response;

            try {
                // Helper to format detailed reports into a markdown table
                const formatDetailedReport = (reportData) => {
                    if (!reportData || reportData.length === 0) return "No detailed activity found for that date.";
                    let table = "| Student Name | Roll No | Assessment | Marks |\n";
                    table +=    "|--------------|---------|------------|-------|\n";
                    reportData.forEach(item => {
                        table += `| ${item.studentName} | ${item.rollNo} | ${item.assessment} | ${item.marks} |\n`;
                    });
                    return `Here are the details for that date:\n${table}`;
                };

                switch (functionName) {
                    case 'get_student_details_by_completion_date':
                        const detailedReport = await reportService.getDetailedReportByCompletionDate(teacherSubject, functionArgs.date);
                        response = { reply: formatDetailedReport(detailedReport) };
                        break;

                    case 'get_student_names_by_completion_date':
                        const studentNames = await reportService.getCompletedAssessmentsByDate(teacherSubject, functionArgs.date);
                        if (studentNames.length > 0) {
                            response = { reply: `On ${functionArgs.date}, the following students completed an assessment: ${studentNames.join(', ')}.` };
                        } else {
                            response = { reply: `No students completed an assessment for ${teacherSubject} on ${functionArgs.date}.` };
                        }
                        break;
                    
                    case 'get_assessment_completion_stats_by_date':
                        const completionStats = await reportService.countCompletedAssessmentsByDate(teacherSubject, functionArgs.date);
                        if (completionStats.completedCount > 0) {
                            response = { reply: `On ${functionArgs.date}, there were ${completionStats.completedCount} assessments completed by ${completionStats.distinctStudents} different student(s).` };
                        } else {
                            response = { reply: `No assessments for ${teacherSubject} were completed on ${functionArgs.date}.` };
                        }
                        break;

                    case 'get_assessment_creation_stats_by_date':
                        const creationStats = await reportService.getAssessmentStatsByCreationDate(functionArgs.date, userDetails);
                        if (creationStats.assessmentsCreated > 0) {
                            response = { reply: `On ${functionArgs.date}, you CREATED ${creationStats.assessmentsCreated} assessments (${creationStats.assessmentNames.join(', ')}).` };
                        } else {
                            response = { reply: `You did not CREATE any assessments for ${teacherSubject} on ${functionArgs.date}.` };
                        }
                        break;

                    case 'get_overall_subject_stats':
                        const overallStats = await reportService.getOverallSubjectStats(teacherSubject);
                        response = { reply: `For the subject ${teacherSubject}, the overall statistics are:\n- Total Students: ${overallStats.totalStudents}\n- Sum of All Marks: ${overallStats.totalMarksSum}\n- Total Assessments Completed: ${overallStats.totalAssessmentsCompleted}` };
                        break;

                    case 'get_top_student_in_subject':
                        const topStudent = await reportService.getTopStudentBySubject(teacherSubject);
                        if (topStudent) {
                            response = { reply: `The student with the highest score is ${topStudent.name}, who has a total of ${topStudent.subjects[0].totalMarks} marks in ${teacherSubject}.` };
                        } else {
                            response = { reply: `I could not determine the top student for ${teacherSubject}.` };
                        }
                        break;

                    case 'get_full_subject_report':
                        const data = await reportService.getStudentSubjectReportData(teacherSubject);
                        if (!data || data.length === 0) {
                            response = { reply: `I couldn't find any student report data for the subject ${teacherSubject}.` };
                        } else {
                            response = { reply: `I found a full report for ${data.length} students in ${teacherSubject}. You can download the Excel file for full details.` };
                        }
                        break;
                        case 'get_ranked_students_by_performance':
                        const rankedStudents = await reportService.getRankedStudentsByPerformance(teacherSubject, functionArgs.rank_order, functionArgs.limit || 5);
                        response = { reply: `Here are the students ranked by performance:\n${formatListAsTable(rankedStudents, ['Name', 'Student ID', 'Total Marks'])}` };
                        break;
                    
                    case 'get_students_by_performance_in_assessment':
                        const filteredStudents = await reportService.getStudentsByPerformanceInAssessment(teacherSubject, functionArgs.assessment_name, functionArgs.condition, functionArgs.mark);
                        response = { reply: `Here are the students who scored ${functionArgs.condition} ${functionArgs.mark} in "${functionArgs.assessment_name}":\n${formatListAsTable(filteredStudents, ['Name', 'Student ID', 'Marks'])}` };
                        break;

                    case 'get_single_student_progress_report':
                        const progressReport = await reportService.getSingleStudentProgressReport(teacherSubject, functionArgs.student_id);
                        const breakdownText = formatListAsTable(progressReport.breakdown, ['Assessment Name', 'Status', 'Marks']);
                        response = { reply: `Progress report for ${progressReport.studentName}:\n- Attended: ${progressReport.assessmentsAttended} / ${progressReport.totalAssessmentsForSubject}\n${breakdownText}` };
                        break;

                    case 'compare_student_performance_across_assessments':
                        const comparison = await reportService.compareStudentPerformanceAcrossAssessments(functionArgs.student_id, functionArgs.assessment_names);
                        const comparisonText = comparison.comparison.map(c => `- ${c.assessmentName}: ${c.marks}`).join('\n');
                        response = { reply: `Performance comparison for ${comparison.studentName}:\n${comparisonText}` };
                        break;
                         case 'get_locked_out_submissions':
                        const lockedSubs = await reportService.getLockedOutSubmissions(teacherSubject, functionArgs.assessment_name);
                        response = { reply: `Found ${lockedSubs.length} locked submissions:\n${formatListAsTable(lockedSubs, ['Student Name', 'Student ID', 'Assessment Name', 'Status'])}` };
                        break;
                    
                    case 'get_assessment_with_most_absentees':
                        const mostMissed = await reportService.getAssessmentWithMostAbsentees(teacherSubject, userDetails.department, userDetails.year);
                        if(mostMissed.assessmentName){
                            response = { reply: `The assessment with the most absentees is "${mostMissed.assessmentName}", with ${mostMissed.absenteeCount} students not completing it.` };
                        } else {
                            response = { reply: mostMissed.message || "Could not determine the assessment with the most absentees." };
                        }
                        break;

                    case 'duplicate_assessment':
                        const { source_assessment_name, new_assessment_name, ...newDateInfo } = functionArgs;
                        const newAssessment = await assessmentService.duplicateAssessment(source_assessment_name, new_assessment_name, userDetails, newDateInfo);
                        response = { reply: `Successfully duplicated "${source_assessment_name}" to a new assessment named "${newAssessment.name}" with ID ${newAssessment._id}.` };
                        break;

                    default:
                        response = { reply: "I'm sorry, I'm not able to perform that specific action." };
                        break;
                }
            } catch (err) {
                response = { reply: `An error occurred while processing your request: ${err.message}` };
            }

            return res.status(200).json(response);
        } else {
            return res.status(200).json({ reply: responseMessage.content });
        }
    } catch (error) {
        console.error('Error in chatbot controller:', error);
        res.status(500).json({ message: 'An error occurred with the AI assistant.' });
    }
};

module.exports = {
    getSubjectPerformanceReport,
    downloadSubjectPerformanceReport,
    getTeacherDateWiseReport,
    handleChatbotQuery,
}