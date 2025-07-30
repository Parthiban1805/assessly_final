const adminService = require('./admin.service');
const Groq = require('groq-sdk');
require('dotenv').config();

// Import all the services the bot will need to use
const userService = require('../users/users.service');
const assessmentService = require('../assessments/assessments.service');
const notificationService = require('../notifications/notifications.service');
const settingsService = require('../settings/settings.service');
const curriculumService = require('../curriculum/curriculum.service');
const tempFileCache = require('../utils/tempFileCache'); // Import our temporary cache

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

/**
 * Controller to handle the request for the Admin Dashboard's initial data.
 */
const getDashboardData = async (req, res) => {
    try {
        const pageData = await adminService.getDashboardData();
        res.status(200).json(pageData);
    } catch (error) {
        console.error('Error fetching admin dashboard data:', error);
        res.status(500).json({ 
            message: 'Server error while fetching dashboard data.' 
        });
    }
};

// Helper function to format arrays of objects in a human-readable way
const formatArrayData = (data, title) => {
    if (!data || data.length === 0) {
        return `No ${title.toLowerCase()} found.`;
    }

    let result = `Found ${data.length} ${title.toLowerCase()}:\n\n`;
    
    data.forEach((item, index) => {
        result += `${index + 1}. `;
        
        // Format based on the type of data
        if (item.name) {
            result += `**${item.name}**\n`;
        }
        
        // Add relevant fields
        Object.keys(item).forEach(key => {
            if (key !== 'name' && key !== '_id' && key !== '__v' && key !== 'password') {
                const value = item[key];
                if (value !== null && value !== undefined && value !== '') {
                    // Format field names to be more readable
                    const fieldName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    result += `   ${fieldName}: ${value}\n`;
                }
            }
        });
        result += '\n';
    });
    
    return result;
};

// Helper function to format single objects
const formatObjectData = (data, title) => {
    if (!data) {
        return `No ${title.toLowerCase()} found.`;
    }

    let result = `**${title}:**\n\n`;
    
    Object.keys(data).forEach(key => {
        if (key !== '_id' && key !== '__v' && key !== 'password') {
            const value = data[key];
            if (value !== null && value !== undefined && value !== '') {
                // Format field names to be more readable
                const fieldName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                result += `**${fieldName}:** ${value}\n`;
            }
        }
    });
    
    return result;
};

// Helper function to format performance ranking
const formatPerformanceRanking = (ranking) => {
    if (!ranking || ranking.length === 0) {
        return "No performance data available.";
    }

    let result = "**Subject Performance Ranking:**\n\n";
    
    ranking.forEach((subject, index) => {
        const rank = index + 1;
        const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}.`;
        result += `${medal} **${subject.subject}**\n`;
        result += `   Average Score: ${subject.averageScore.toFixed(2)}%\n`;
        result += `   Total Assessments: ${subject.totalAssessments}\n`;
        result += `   Students Assessed: ${subject.studentsAssessed}\n\n`;
    });
    
    return result;
};


const downloadTempCsv = (req, res) => {
    const { id } = req.params;
    const fileData = tempFileCache.get(id);

    if (!fileData) {
        return res.status(404).send("File not found or has expired.");
    }

    const { buffer, fileName, mimeType } = fileData;

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.send(buffer);
};


/**
 * Controller to handle natural language queries for the Admin Chatbot.
 */
const handleAdminChatQuery = async (req, res) => {
    const { query, conversationHistory = [] } = req.body;

    if (!query) {
        return res.status(400).json({ 
            message: "Query is required." 
        });
    }

    // === COMPREHENSIVE AND CLEANED TOOL DEFINITIONS ===
    const tools = [
        // --- Student Tools ---
        {
            type: 'function',
            function: {
                name: 'search_students_by_name',
                description: "Search for students by name.",
                parameters: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' }
                    },
                    required: ['name']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'get_student_details_by_id',
                description: "Get a student's details by their unique ID.",
                parameters: {
                    type: 'object',
                    properties: {
                        studentId: { type: 'string' }
                    },
                    required: ['studentId']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'delete_student_by_id',
                description: "Deletes a student. Must confirm with user first.",
                parameters: {
                    type: 'object',
                    properties: {
                        studentId: { type: 'string' }
                    },
                    required: ['studentId']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'create_student_profile',
                description: 'Creates a new student profile. Ask for any missing parameters.',
                parameters: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        email: { type: 'string' },
                        password: { type: 'string' },
                        student_id: { type: 'string' },
                        semester: { type: 'string' },
                        year: { type: 'string' },
                        boarding: { type: 'string' },
                        class_advisor: { type: 'string' },
                        department: { type: 'string' },
                        phone: { type: 'string' }
                    },
                    required: [
                        'name', 'email', 'password', 'student_id', 
                        'semester', 'year', 'boarding', 'class_advisor', 
                        'department', 'phone'
                    ]
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'update_student_details',
                description: 'Updates a student\'s details.',
                parameters: {
                    type: 'object',
                    properties: {
                        studentId: { type: 'string' },
                        updates: {
                            type: 'object',
                            description: 'A JSON object with the fields to update'
                        }
                    },
                    required: ['studentId', 'updates']
                }
            }
        },
        
        // --- Teacher Tools ---
        {
            type: 'function',
            function: {
                name: 'search_teachers_by_name',
                description: "Search for teachers by name.",
                parameters: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' }
                    },
                    required: ['name']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'get_teacher_details_by_id',
                description: "Get a teacher's details by their unique ID.",
                parameters: {
                    type: 'object',
                    properties: {
                        teacherId: { type: 'string' }
                    },
                    required: ['teacherId']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'delete_teacher_by_id',
                description: "Deletes a teacher. Must confirm with user first.",
                parameters: {
                    type: 'object',
                    properties: {
                        teacherId: { type: 'string' }
                    },
                    required: ['teacherId']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'create_teacher_profile',
                description: 'Creates a new teacher profile. Ask for any missing parameters.',
                parameters: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        email: { type: 'string' },
                        password: { type: 'string' },
                        teacher_id: { type: 'string' },
                        department: { type: 'string' },
                        subjects: {
                            type: 'string',
                            description: 'Comma-separated list'
                        }
                    },
                    required: [
                        'name', 'email', 'password', 'teacher_id', 
                        'department', 'subjects'
                    ]
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'update_teacher_details',
                description: 'Updates a teacher\'s details.',
                parameters: {
                    type: 'object',
                    properties: {
                        teacherId: { type: 'string' },
                        updates: {
                            type: 'object',
                            description: 'A JSON object with the fields to update'
                        }
                    },
                    required: ['teacherId', 'updates']
                }
            }
        },

        // --- Assessment & Notification Tools ---
        {
            type: 'function',
            function: {
                name: 'get_assessment_details_by_id',
                description: 'Get details for a single assessment by its ID.',
                parameters: {
                    type: 'object',
                    properties: {
                        assessmentId: { type: 'string' }
                    },
                    required: ['assessmentId']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'get_notification_details_by_id',
                description: 'Get details for a single notification by its ID.',
                parameters: {
                    type: 'object',
                    properties: {
                        notificationId: { type: 'string' }
                    },
                    required: ['notificationId']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'create_notification',
                description: 'Creates a new notification. Ask for any missing parameters.',
                parameters: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        description: { type: 'string' },
                        openDate: {
                            type: 'string',
                            description: 'YYYY-MM-DD'
                        },
                        openTime: {
                            type: 'string',
                            description: 'HH:MM'
                        },
                        closeDate: {
                            type: 'string',
                            description: 'YYYY-MM-DD'
                        },
                        closeTime: {
                            type: 'string',
                            description: 'HH:MM'
                        }
                    },
                    required: [
                        'name', 'description', 'openDate', 'openTime', 
                        'closeDate', 'closeTime'
                    ]
                }
            }
        },
        
        // --- System-Wide Analytics, Security & Meta Tools ---
        {
            type: 'function',
            function: {
                name: 'get_cross_subject_performance_ranking',
                description: "Ranks all subjects by their average student performance.",
                parameters: {
                    type: 'object',
                    properties: {}
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'find_inactive_teachers',
                description: "Finds teachers who have not created any new assessments within a specified number of days.",
                parameters: {
                    type: 'object',
                    properties: {
                        days_inactive: {
                            type: 'number',
                            default: 30
                        }
                    },
                    required: ['days_inactive']
                }
            }
        },
         { 
            type: 'function',
            function: {
                name: 'find_inactive_students',
                description: "Finds STUDENTS who have not COMPLETED any assessments within a specified number of days.",
                parameters: { type: 'object', properties: { days_inactive: { type: 'number', default: 30 } }, required: ['days_inactive'] }
            }
        },
        {
            type: 'function',
            function: {
                name: 'find_accounts_with_duplicate_emails',
                description: "Scans for user accounts that share the same email address.",
                parameters: {
                    type: 'object',
                    properties: {}
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'force_user_password_reset',
                description: "Securely resets a user's password to a new temporary password.",
                parameters: {
                    type: 'object',
                    properties: {
                        user_id: { type: 'string' },
                        user_type: {
                            type: 'string',
                            enum: ['student', 'teacher']
                        },
                        new_password: { type: 'string' }
                    },
                    required: ['user_id', 'user_type', 'new_password']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'update_global_setting',
                description: "Updates a global application setting, like 'DisplayAnswers'.",
                parameters: {
                    type: 'object',
                    properties: {
                        setting_name: {
                            type: 'string',
                            enum: ['DisplayAnswers']
                        },
                        is_enabled: { type: 'boolean' }
                    },
                    required: ['setting_name', 'is_enabled']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'bulk_delete_expired_notifications',
                description: "Deletes all notifications that expired before a given date.",
                parameters: {
                    type: 'object',
                    properties: {
                        expiry_date: {
                            type: 'string',
                            description: 'YYYY-MM-DD'
                        }
                    },
                    required: ['expiry_date']
                }
            }
        },
        // -- Curriculum, Staffing, and Resource Management
         {
            type: 'function',
            function: {
                name: 'find_subjects_with_no_assessments',
                description: "Finds subjects for a given year and department that have no assessments created yet.",
                parameters: { type: 'object', properties: { year: { type: 'number' }, department: { type: 'string' } }, required: ['year', 'department'] }
            }
        },
        {
            type: 'function',
            function: {
                name: 'get_subject_staff_assignment',
                description: "Finds the assigned staff for a subject, or all subjects assigned to a staff member.",
                parameters: { type: 'object', properties: { subject_name: { type: 'string' }, staff_name: { type: 'string' } } }
            }
        },
        {
            type: 'function',
            function: {
                name: 'assign_staff_to_subject',
                description: "Assigns a staff member to a specific subject. This is a write action.",
                parameters: { type: 'object', properties: { subject_name: { type: 'string' }, year: { type: 'number' }, department: { type: 'string' }, staff_name: { type: 'string' } }, required: ['subject_name', 'year', 'department', 'staff_name'] }
            }
        },

        // --- NEW: Study Material & Resource Management Tools ---
        {
            type: 'function',
            function: {
                name: 'count_study_materials_by_teacher',
                description: "Counts how many study materials were uploaded by a specific teacher, optionally filtered by subject.",
                parameters: { type: 'object', properties: { teacher_id: { type: 'string' }, subject_name: { type: 'string' } }, required: ['teacher_id'] }
            }
        },
        {
            type: 'function',
            function: {
                name: 'list_study_materials_by_curriculum',
                description: "Lists all available study materials for a specific year and department.",
                parameters: { type: 'object', properties: { year: { type: 'number' }, department: { type: 'string' } }, required: ['year', 'department'] }
            }
        },
        {
            type: 'function',
            function: {
                name: 'find_subjects_missing_study_materials',
                description: "Identifies which subjects for a year/department are missing study materials.",
                parameters: { type: 'object', properties: { year: { type: 'number' }, department: { type: 'string' } }, required: ['year', 'department'] }
            }
        },
    ];

    try {
        const messages = [
            {
                role: 'system',
                content: `You are a direct, efficient, and secure AI assistant for a school administrator. 
                You have access to comprehensive tools for managing students, teachers, assessments, 
                notifications, and system settings. Always confirm destructive actions before proceeding.
                
                Key Guidelines:
                - Be professional and concise in responses
                - Always ask for confirmation before deleting any records
                - Format data clearly and readably
                - Handle errors gracefully
                - Prioritize security and data integrity
                - When creating profiles, ensure all required fields are provided
                - For updates, only modify the specified fields
                
                Available Operations:
                - Student Management: Search, view, create, update, delete students
                - Teacher Management: Search, view, create, update, delete teachers  
                - Assessment Management: View assessment details
                - Notification Management: View and create notifications
                - System Analytics: Performance rankings, inactive user detection
                - Security Operations: Duplicate email detection, password resets
                - Settings Management: Global application settings
                - Maintenance: Bulk cleanup operations`
            },
            ...conversationHistory,
            { role: 'user', content: query }
        ];

        const chatCompletion = await groq.chat.completions.create({
            messages,
            model: 'llama3-70b-8192',
            tools,
            tool_choice: 'auto'
        });

        const responseMessage = chatCompletion.choices[0].message;

        if (responseMessage.tool_calls) {
            const toolCall = responseMessage.tool_calls[0];
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);
            let response;

            const DOWNLOAD_THRESHOLD = 5;

            try {
                 const generateCsvAndGetLink = (data, baseFileName) => {
                    if (!data || data.length === 0) {
                        return { reply: "No data available to generate a file." };
                    }
                    try {
                        const parser = new Parser();
                        const csvBuffer = Buffer.from(parser.parse(data));
                        const fileName = `${baseFileName}_${new Date().toISOString().split('T')[0]}.csv`;
                        
                        // Store in cache and get unique ID
                        const fileId = tempFileCache.set(csvBuffer, fileName, 'text/csv');
                        
                        // The API base URL should ideally come from an environment variable
                        const downloadUrl = `${req.protocol}://${req.get('host')}/api/v1/admin/download-csv/${fileId}`;
                        
                        return { 
                            reply: `I found ${data.length} records. This is too large to display. Please use the link to download the report:\n\n[Download ${fileName}](${downloadUrl})`
                        };
                    } catch (csvError) {
                        console.error("CSV generation error:", csvError);
                        throw new Error("Failed to generate the CSV file.");
                    }
                };
                switch (functionName) {
                    // --- Student Cases ---
                    case 'search_students_by_name':
                        const students = await userService.searchStudentsByName(functionArgs.name);
                        response = { reply: formatArrayData(students, 'Students') };
                        break;

                    case 'get_student_details_by_id':
                        const studentDetails = await userService.getStudentDetails(functionArgs.studentId);
                        response = { reply: formatObjectData(studentDetails, 'Student Details') };
                        break;

                    case 'delete_student_by_id':
                        await userService.deleteStudent(functionArgs.studentId);
                        response = { reply: `✅ Student with ID ${functionArgs.studentId} has been successfully deleted.` };
                        break;

                    case 'create_student_profile':
                        const newStudent = await userService.createStudent(functionArgs);
                        response = { 
                            reply: `✅ **Student Profile Created Successfully!**\n\n**Name:** ${newStudent.name}\n**Student ID:** ${newStudent.student_id}\n**Email:** ${newStudent.email}\n**Department:** ${newStudent.department}\n\nThe student can now login with their credentials.` 
                        };
                        break;

                    case 'update_student_details':
                        const updatedStudent = await userService.updateStudent(
                            functionArgs.studentId, 
                            functionArgs.updates
                        );
                        response = { 
                            reply: `✅ **Student Updated Successfully!**\n\n${formatObjectData(updatedStudent, 'Updated Student Details')}` 
                        };
                        break;

                    // --- Teacher Cases ---
                    case 'search_teachers_by_name':
                        const teachersSearch = await userService.searchTeachersByName(functionArgs.name);
                        response = { reply: formatArrayData(teachersSearch, 'Teachers') };
                        break;

                    case 'get_teacher_details_by_id':
                        const teacherDetails = await userService.getTeacherDetails(functionArgs.teacherId);
                        response = { reply: formatObjectData(teacherDetails, 'Teacher Details') };
                        break;

                    case 'delete_teacher_by_id':
                        await userService.deleteTeacher(functionArgs.teacherId);
                        response = { reply: `✅ Teacher with ID ${functionArgs.teacherId} has been successfully deleted.` };
                        break;

                    case 'create_teacher_profile':
                        const newTeacher = await userService.createTeacher(functionArgs);
                        response = { 
                            reply: `✅ **Teacher Profile Created Successfully!**\n\n**Name:** ${newTeacher.name}\n**Teacher ID:** ${newTeacher.teacher_id}\n**Email:** ${newTeacher.email}\n**Department:** ${newTeacher.department}\n**Subjects:** ${newTeacher.subjects}\n\nThe teacher can now login with their credentials.` 
                        };
                        break;

                    case 'update_teacher_details':
                        const updatedTeacher = await userService.updateTeacher(
                            functionArgs.teacherId, 
                            functionArgs.updates
                        );
                        response = { 
                            reply: `✅ **Teacher Updated Successfully!**\n\n${formatObjectData(updatedTeacher, 'Updated Teacher Details')}` 
                        };
                        break;

                    // --- Assessment & Notification Cases ---
                    case 'get_assessment_details_by_id':
                        const assessmentDetails = await assessmentService.getAssessmentDetailsById(functionArgs.assessmentId);
                        response = { reply: formatObjectData(assessmentDetails, 'Assessment Details') };
                        break;

                    case 'get_notification_details_by_id':
                        const notificationDetails = await notificationService.getNotificationById(functionArgs.notificationId);
                        response = { reply: formatObjectData(notificationDetails, 'Notification Details') };
                        break;

                    case 'create_notification':
                        const newNotification = await notificationService.createNotification(functionArgs);
                        response = { reply: `✅ **Notification Created Successfully!**\n\n**Title:** ${newNotification.name}\n**Description:** ${newNotification.description}\n**Open Date:** ${functionArgs.openDate} at ${functionArgs.openTime}\n**Close Date:** ${functionArgs.closeDate} at ${functionArgs.closeTime}` };
                        break;

                    // --- System-Wide Analytics, Security & Meta Cases ---
                    case 'get_cross_subject_performance_ranking':
                        const ranking = await adminService.getCrossSubjectPerformanceRanking();
                        response = { reply: formatPerformanceRanking(ranking) };
                        break;

                    case 'find_inactive_teachers':
                        const inactiveTeachers = await adminService.findInactiveTeachers(functionArgs.days_inactive);
                        response = { 
                            reply: `📊 **Inactive Teachers Report (${functionArgs.days_inactive} days)**\n\n${formatArrayData(inactiveTeachers, 'Inactive Teachers')}` 
                        };
                        break;

                    case 'find_inactive_students':
                        const inactiveStudents = await adminService.findInactiveStudents(functionArgs.days_inactive);
                        response = { 
                            reply: `📊 **Inactive Students Report (${functionArgs.days_inactive} days)**\n\n${formatArrayData(inactiveStudents, 'Inactive Students')}` 
                        };
                        break;

                    case 'find_accounts_with_duplicate_emails':
                        const duplicates = await adminService.findAccountsWithDuplicateEmails();
                        response = { reply: `🔍 **Duplicate Email Scan Results**\n\n${formatArrayData(duplicates, 'Duplicate Email Accounts')}` };
                        break;

                    case 'force_user_password_reset':
                        const resetResult = await userService.forcePasswordReset(
                            functionArgs.user_id, 
                            functionArgs.user_type, 
                            functionArgs.new_password
                        );
                        response = { reply: `🔒 **Password Reset Successful**\n\n${resetResult.message}` };
                        break;

                    case 'update_global_setting':
                        if (functionArgs.setting_name === 'DisplayAnswers') {
                            const updatedSetting = await settingsService.updateDisplayAnswersSetting(functionArgs.is_enabled);
                            response = { 
                                reply: `⚙️ **Setting Updated Successfully**\n\n**Setting:** ${updatedSetting.settingName}\n**Status:** ${updatedSetting.isEnabled ? '✅ ENABLED' : '❌ DISABLED'}` 
                            };
                        } else {
                            response = { reply: `❌ Unknown setting name: ${functionArgs.setting_name}` };
                        }
                        break;

                    case 'bulk_delete_expired_notifications':
                        const deleteResult = await adminService.bulkDeleteExpiredNotifications(functionArgs.expiry_date);
                        response = { reply: `🗑️ **Cleanup Complete**\n\nDeleted ${deleteResult.deletedCount} expired notifications that expired before ${functionArgs.expiry_date}.` };
                        break;

                    case 'find_subjects_with_no_assessments':
                        const emptySubjects = await curriculumService.findSubjectsWithNoAssessments(functionArgs.year, functionArgs.department);
                        response = { reply: `📚 **Subjects Without Assessments (Year ${functionArgs.year}, ${functionArgs.department})**\n\n${formatArrayData(emptySubjects, 'Subjects')}` };
                        break;

                    case 'get_subject_staff_assignment':
                        const assignment = await curriculumService.getSubjectStaffAssignment(functionArgs.subject_name, functionArgs.staff_name);
                        response = { reply: `👥 **Staff Assignment Details**\n\n${formatObjectData(assignment, 'Assignment')}` };
                        break;

                    case 'assign_staff_to_subject':
                        const updatedSubject = await curriculumService.assignStaffToSubject(functionArgs.subject_name, functionArgs.year, functionArgs.department, functionArgs.staff_name);
                        response = { reply: `✅ **Staff Assignment Successful**\n\n**Subject:** ${updatedSubject.name}\n**Assigned Staff:** ${updatedSubject.staff}\n**Year:** ${functionArgs.year}\n**Department:** ${functionArgs.department}` };
                        break;

                    case 'count_study_materials_by_teacher':
                        const count = await curriculumService.countStudyMaterialsByTeacher(functionArgs.teacher_id, functionArgs.subject_name);
                        response = { reply: `📚 **Study Materials Count**\n\n**Teacher ID:** ${functionArgs.teacher_id}\n**Materials Uploaded:** ${count}${functionArgs.subject_name ? `\n**Subject:** ${functionArgs.subject_name}` : ' (All subjects)'}` };
                        break;

                    case 'list_study_materials_by_curriculum':
                        const materials = await curriculumService.listStudyMaterialsByCurriculum(functionArgs.year, functionArgs.department);
                        response = { reply: `📚 **Study Materials (Year ${functionArgs.year}, ${functionArgs.department})**\n\n${formatArrayData(materials, 'Study Materials')}` };
                        break;

                    case 'find_subjects_missing_study_materials':
                        const missingMaterials = await curriculumService.findSubjectsMissingStudyMaterials(functionArgs.year, functionArgs.department);
                        if (missingMaterials.length === 0) {
                            response = { reply: `✅ **All subjects for Year ${functionArgs.year} ${functionArgs.department} have study materials available.** Great job!` };
                        } else {
                            response = { reply: `⚠️ **Missing Study Materials (Year ${functionArgs.year}, ${functionArgs.department})**\n\nThe following subjects need study materials:\n\n${missingMaterials.map((subject, index) => `${index + 1}. **${subject}**`).join('\n')}` };
                        }
                        break;

                    default:
                        response = { reply: "❌ Sorry, an unknown function was called." };
                        break;
                }
            } catch (err) {
                console.error('Function execution error:', err);
                response = { reply: `❌ **Error occurred:** ${err.message}` };
            }

            return res.status(200).json(response);
        } else {
            return res.status(200).json({ reply: responseMessage.content });
        }

    } catch (error) {
        console.error('Error in admin chatbot controller:', error);
        return res.status(500).json({ 
            message: 'An error occurred with the AI assistant.' 
        });
    }
};

module.exports = {
    getDashboardData,
    handleAdminChatQuery,
    downloadTempCsv ,
};