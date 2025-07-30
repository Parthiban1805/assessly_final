// File: src/features/assessments/assessments.service.js
const mongoose = require('mongoose');
// Import all necessary models from their feature folders
const { Assessment, Question, AssignedQuestions, StudentAnswers, AnswerCheck } = require('./assessments.model');
const { Marks } = require('../grades/grades.model'); // Example path
const { Grades } = require('../grades/grades.model'); // Example path
const csv = require('csv-parser');
const { Readable } = require('stream');
const { Subject } = require('../subjects/subjects.model'); // Adjust path
const AssessmentResult = require('../results/results.model');

/**
 * A helper function to promisify the CSV stream parsing.
 * This wraps the event-based stream in a promise we can await.
 * @param {Buffer} buffer - The file buffer from multer.
 * @returns {Promise<Array<object>>} A promise that resolves with an array of question objects.
 */
const parseQuestionsFromStream = (buffer) => {
    return new Promise((resolve, reject) => {
        const questions = [];
        const stream = Readable.from(buffer);

        stream.pipe(csv())
            .on('data', (row) => {
                const getField = (fieldName) => {
                    const key = Object.keys(row).find(k => k.toLowerCase() === fieldName.toLowerCase());
                    return key ? row[key] : null;
                };
                
                const questionText = getField('question');
                const answer = getField('answer');
                const markStr = getField('mark');
                const mark = markStr ? Number(markStr) : null;

                if (questionText && answer && mark !== null && !isNaN(mark)) {
                    questions.push({
                        question: questionText,
                        options: [getField('option1'), getField('option2'), getField('option3'), getField('option4')].filter(Boolean),
                        answer,
                        mark,
                        tag: getField('tags') || 'General',
                    });
                }
            })
            .on('end', () => {
                // When the stream is finished, resolve the promise with the parsed questions.
                resolve(questions);
            })
            .on('error', (err) => {
                // If the stream errors, reject the promise.
                reject(err);
            });
    });
};


/**
 * Creates a new assessment, parses a CSV for questions, and links them.
 * @param {object} assessmentData - Data from the request body (name, subjectName, etc.).
 * @param {object} teacherDetails - The teacher's details from the JWT.
 * @param {object} file - The uploaded file object from multer.
 * @returns {Promise<object>} The newly created assessment document.
 */
const createAssessmentWithQuestions = async (assessmentData, teacherDetails, file) => {
    if (!file) {
        throw new Error('No question file was uploaded.');
    }

    const {
        name, subjectName, year, department, openDate, openTime,
        closeDate, closeTime, questionperstudent, tags, examDurationMinutes,
        allowFlexibleTiming
    } = assessmentData;
    
    let parsedTags;
    try {
        parsedTags = tags && typeof tags === 'string' ? JSON.parse(tags) : [];
    } catch (e) {
        const err = new Error('The "tags" field contains invalid data. It must be a valid JSON array string.');
        err.statusCode = 400;
        throw err;
    }

    let savedAssessment = null; // Declare here for the catch block
    
    try {
        // Step 1: Parse questions from the file first. If this fails, we haven't touched the DB.
        const questions = await parseQuestionsFromStream(file.buffer);

        if (questions.length === 0) {
            const err = new Error('CSV file is empty or contains no valid questions. Each row requires a "question", "answer", and a numeric "mark".');
            err.statusCode = 400;
            throw err;
        }

        // Step 2: Create the Assessment document
        const newAssessment = new Assessment({
            teacher_id: teacherDetails.teacher_id,
            name,
            subjectName,
            year,
            department,
            openDate,
            openTime,
            closeDate,
            closeTime,
            questionperstudent,
            examDurationMinutes,
            allowFlexibleTiming: allowFlexibleTiming || false,
            tags: parsedTags,
        });
        savedAssessment = await newAssessment.save();

        // Step 3: Link the new assessment to its subject
        const subject = await Subject.findOne({ name: subjectName, year: parseInt(year, 10), department });
        if (!subject) {
            const err = new Error('Subject not found. Please ensure the subject exists for the given year and department.');
            err.statusCode = 404;
            throw err; // This will trigger the catch block below for rollback
        }
        subject.assessments.push(savedAssessment._id);
        await subject.save();
        
        // Step 4: Create the Question documents, now that everything else is successful
        await Question.create({
            assessmentId: savedAssessment._id,
            teacher_id: teacherDetails.teacher_id,
            questions,
        });

        console.log(`${questions.length} questions stored for assessment ${savedAssessment._id}`);
        return savedAssessment; // Success! Return the final assessment.

    } catch (error) {
        // --- Centralized Rollback Logic ---
        // If any step failed, and the assessment was already created, delete it.
        if (savedAssessment && savedAssessment._id) {
            console.error(`Rolling back creation of assessment ${savedAssessment._id} due to an error.`);
            await Assessment.findByIdAndDelete(savedAssessment._id);
            // You might also want to pull the ID from the subject if that step was reached, but this is simpler.
        }
        
        // Re-throw the error so the controller can send a proper response.
        console.error('Error during assessment creation:', error.message);
        throw error;
    }
};



// --- Helper Utilities ---
function getAssessmentStatus(assessment) {
    const now = new Date();
    
    // Create proper DateTime objects from separate date and time fields
    const openDateTime = new Date(`${assessment.openDate} ${assessment.openTime}`);
    const closeDateTime = new Date(`${assessment.closeDate} ${assessment.closeTime}`);
    
    if (now < openDateTime) return 'not_opened';
    if (now > closeDateTime) return 'closed';
    return 'open';
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// In a real app, this should be in its own module and be more robust
function selectQuestionsByWeightage(allQuestions, tags, limit) {
    // For now, we'll just use the fallback shuffle
    return shuffleArray(allQuestions).slice(0, limit);
}

// --- Service Functions ---

/**
 * Gets all data needed to start or resume an assessment.
 * This combines fetching the assessment, checking status, and getting/assigning questions.
 */
const getInitialAssessmentData = async (studentId, assessmentId) => {
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
        const err = new Error('Assessment not found.');
        err.statusCode = 404;
        throw err;
    }

    const studentMark = await Marks.findOne({ studentId, 'assessments.assessmentId': assessmentId });
    if (studentMark?.assessments.some(a => a.statuses === 'completed')) {
        const err = new Error('You have already completed this assessment.');
        err.statusCode = 403;
        throw err;
    }

    let assigned = await AssignedQuestions.findOne({ studentId, assessmentId });

    if (!assigned) {
        const allQuestions = (await Question.find({ assessmentId })).flatMap(q => q.questions);
        if (allQuestions.length === 0) {
            const err = new Error('No questions found for this assessment.');
            err.statusCode = 404;
            throw err;
        }

        const limit = assessment.questionperstudent || allQuestions.length;
        let selectedQuestions;
        if (assessment.tags?.length > 0) {
            selectedQuestions = selectQuestionsByWeightage(allQuestions, assessment.tags, limit);
        } else {
            selectedQuestions = shuffleArray(allQuestions).slice(0, limit);
        }

        assigned = new AssignedQuestions({
            studentId,
            assessmentId,
            questions: selectedQuestions.map(q => ({ ...q.toObject(), id: q._id })), // Ensure 'id' field exists
            answeredquestions: []
        });
        await assigned.save();
    }

    return {
        assessment,
        assignedQuestions: {
            questions: assigned.questions,
            answeredquestions: assigned.answeredquestions
        }
    };
};

/**
 * Saves a student's ongoing answer progress.
 */
const saveAnswerProgress = async (studentId, assessmentId, answeredquestions) => {
    return AssignedQuestions.findOneAndUpdate(
        { studentId, assessmentId },
        { $set: { answeredquestions } },
        { new: true }
    );
};

/**
 * Handles the final submission of an assessment.
 * It saves the final answers and triggers background processing for grading.
 */
const submitAssessment = async (student_id, assessmentId, answers, userDetails) => {
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) throw new Error('Assessment not found');

    // 1. Immediately save the raw answers for logging/auditing
    const studentAnswerDoc = new StudentAnswers({
        assessmentId,
        studentId: student_id,
        year: userDetails.year,
        answers
    });
    await studentAnswerDoc.save();
    
    // 2. Trigger the grading and result processing in the background
    processAssessmentInBackground(student_id, assessmentId, answers, userDetails, assessment);

    // 3. Return an immediate success message to the client
    return { message: 'Assessment submitted successfully. Results are being processed.' };
};
/**
 * Locks a student's assessment due to violations.
 */
const lockStudentAssessment = async (studentId, assessmentId) => {
    return Marks.findOneAndUpdate(
        { studentId },
        { $push: { assessments: { assessmentId, marks: 0, statuses: 'completed', locked: true } } },
        { upsert: true, new: true }
    );
};

// --- Background Grading Process ---
/**
 * This function runs asynchronously after submission.
 * It calculates marks, updates total marks, and regenerates grade averages.
 */
// File: src/features/assessments/assessments.service.js

// ... (keep other functions) ...

/**
 * This function runs asynchronously after submission.
 * It calculates marks, updates total marks, and regenerates grade averages.
 */
// File: src/features/assessments/assessments.service.js
async function processAssessmentInBackground(studentId, assessmentId, answers, userDetails, assessment) {
    try {
        const questions = await Question.find({ assessmentId: assessment._id });
        const questionMap = new Map();
        questions.forEach(qDoc => qDoc.questions.forEach(q => {
            questionMap.set(q._id.toString(), {
                question: q.question,
                answer: q.answer,
                mark: q.mark
            });
        }));

        let totalMarks = 0;
        const results = answers.map(({ questionId, selectedAnswer }) => {
            const questionDetail = questionMap.get(questionId);
            if (!questionDetail) return null;

            const isCorrect = selectedAnswer === questionDetail.answer;
            if (isCorrect) {
                totalMarks += questionDetail.mark;
            }

            return { questionId, ...questionDetail, selectedAnswer, isCorrect };
        }).filter(Boolean);

        // This line will now work correctly because AssessmentResult is the constructor.
        const assessmentResultDoc = new AssessmentResult({
            assessmentId,
            studentId,
            results,
            totalMarks,
        });
        await assessmentResultDoc.save();

        // Update Marks collection
        await Marks.findOneAndUpdate(
            { studentId },
            { $push: { assessments: { assessmentId, marks: totalMarks, statuses: 'completed' } } },
            { new: true, upsert: true }
        );

        // Update Grades collection using the helper
        await updateStudentGrades(studentId, userDetails.year);
        
        console.log(`Successfully processed results for student ${studentId}`);

    } catch (error) {
        console.error(`Error during background processing for student ${studentId}:`, error);
    }
}


/**
 * A helper service to recalculate a student's entire grade summary for a given year.
 */
async function updateStudentGrades(studentId, year) {
    const studentMarks = await Marks.findOne({ studentId }).populate('assessments.assessmentId', 'subjectName');
    if (!studentMarks) return;

    const subjectData = new Map();
    studentMarks.assessments.forEach(asm => {
        if (asm.assessmentId?.subjectName) {
            const subjectName = asm.assessmentId.subjectName;
            const current = subjectData.get(subjectName) || { totalMarks: 0, count: 0 };
            current.totalMarks += asm.marks;
            current.count += 1;
            subjectData.set(subjectName, current);
        }
    });

    const formattedAverages = Array.from(subjectData.entries()).map(([name, data]) => ({
        subject: {
            name: name,
            averageMarks: (data.totalMarks / data.count).toFixed(2),
        },
    }));

    await Grades.findOneAndUpdate(
        { studentId, year },
        { assesment_count: formattedAverages.length, subjects: formattedAverages },
        { upsert: true }
    );
}

const getAssessmentStatusAndDetails = async (studentId, assessmentId) => {
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
        const err = new Error('Assessment not found');
        err.statusCode = 404;
        throw err;
    }

    const markRecord = await Marks.findOne({ studentId, 'assessments.assessmentId': assessmentId });
    const isCompleted = markRecord?.assessments?.some(a => a.statuses === 'completed');

    return {
        status: isCompleted ? 'completed' : getAssessmentStatus(assessment),
        assessment
    };
};

/**
 * Retrieves all assessments created by a specific teacher.
 * @param {string} teacherId - The teacher's unique identifier (e.g., 'MVSCH_CMA').
 * @returns {Promise<Array<object>>} A promise that resolves to an array of assessment documents.
 */
const getAssessmentsByTeacher = async (teacherId) => {
    if (!teacherId) {
        throw new Error('Teacher ID is required to fetch assessments.');
    }
    // Find all assessments that match the teacher_id and sort by the most recently created
    const assessments = await Assessment.find({ teacher_id: teacherId }).sort({ createdAt: -1 }).lean();
    return assessments;
};


const getAllAssessmentsForAdmin = async () => {
    // Fetches all assessments and sorts by most recent
    return await Assessment.find().sort({ createdAt: -1 }).lean();
};

const deleteAssessmentById = async (assessmentId) => {
    // TODO: Add more complex logic here if needed, like deleting related questions,
    // results, and marks records to prevent orphaned data.
    const result = await Assessment.findByIdAndDelete(assessmentId);
    if (!result) {
        const err = new Error('Assessment not found for deletion.');
        err.statusCode = 404;
        throw err;
    }
    return { message: 'Assessment deleted successfully.' };
};


/**
 * Gets a single assessment's details by its MongoDB ID.
 * @param {string} assessmentId - The MongoDB ObjectId of the assessment.
 * @returns {Promise<object>} The assessment document.
 */
const getAssessmentDetailsById = async (assessmentId) => {
    // Ensure you have `const { Assessment } = require('./assessments.model');` at the top
    const assessment = await Assessment.findById(assessmentId).lean();
    if (!assessment) {
        const err = new Error('Assessment not found.');
        err.statusCode = 404;
        throw err;
    }
    return assessment;
};


/**
 * CATEGORY 5: Duplicates an assessment and its questions with a new name and dates.
 * @param {string} sourceAssessmentName - The name of the assessment to copy.
 * @param {string} newAssessmentName - The name for the new assessment.
 * @param {object} teacherDetails - The teacher's details from JWT.
 * @param {object} newDateInfo - Object with new open/close dates and times.
 * @returns {Promise<object>} The newly created assessment document.
 */
const duplicateAssessment = async (sourceAssessmentName, newAssessmentName, teacherDetails, newDateInfo) => {
    // 1. Find the source assessment and its questions in parallel.
    const [sourceAssessment, sourceQuestionsDoc] = await Promise.all([
        Assessment.findOne({ name: sourceAssessmentName, teacher_id: teacherDetails.teacher_id }).lean(),
        Question.findOne({ 'assessment.name': sourceAssessmentName, teacher_id: teacherDetails.teacher_id }).lean() // Assuming a denormalized name for easier lookup
    ]);

    if (!sourceAssessment) throw new Error(`Source assessment "${sourceAssessmentName}" not found.`);
    if (!sourceQuestionsDoc || sourceQuestionsDoc.questions.length === 0) throw new Error(`No questions found for "${sourceAssessmentName}".`);

    // 2. Prepare the new assessment document, removing old identifiers.
    const { _id, createdAt, updatedAt, ...newAssessmentData } = sourceAssessment;
    Object.assign(newAssessmentData, {
        name: newAssessmentName,
        ...newDateInfo, // Apply new dates and times
        // Reset timestamps and other instance-specific data
        openDateTime: null, 
        closeDateTime: null,
    });
    
    let savedAssessment = null;
    try {
        // 3. Save the new assessment document.
        const newAssessment = new Assessment(newAssessmentData);
        savedAssessment = await newAssessment.save(); // The 'pre-save' hook will set new open/closeDateTime

        // 4. Create a new question document linked to the new assessment.
        await Question.create({
            assessmentId: savedAssessment._id,
            teacher_id: teacherDetails.teacher_id,
            questions: sourceQuestionsDoc.questions, // Re-use the same array of questions
        });

        return savedAssessment;
    } catch (error) {
        // Rollback logic: If question creation fails, delete the new assessment.
        if (savedAssessment && savedAssessment._id) {
            await Assessment.findByIdAndDelete(savedAssessment._id);
        }
        console.error("Error during assessment duplication, rollback executed.", error);
        throw new Error("Failed to duplicate assessment. Operation rolled back.");
    }
};


module.exports = {
    getInitialAssessmentData,
    saveAnswerProgress,
    submitAssessment,
    lockStudentAssessment,
    getAssessmentStatusAndDetails,
    createAssessmentWithQuestions,
    getAssessmentsByTeacher,
    getAllAssessmentsForAdmin,
    deleteAssessmentById,
    getAssessmentDetailsById,
    duplicateAssessment,
};