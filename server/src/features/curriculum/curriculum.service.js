const { Subject } = require('../subjects/subjects.model'); // Assuming this is the path
const StudyMaterial = require('../study-materials/study-materials.model'); // Assuming this is the path

/**
 * CATEGORY: Curriculum Management
 * Finds subjects that have no assessments linked to them.
 * @param {number} year - The academic year.
 * @param {string} department - The department name.
 * @returns {Promise<Array>} A list of subjects with no assessments.
 */
const findSubjectsWithNoAssessments = async (year, department) => {
    return Subject.find({
        year,
        department,
        assessments: { $size: 0 } // Find documents where the 'assessments' array is empty
    }).select('name staff').lean();
};

/**
 * CATEGORY: Curriculum Management
 * Finds staff assignments for subjects or vice versa.
 * @param {string|null} subjectName - The name of the subject to find the teacher for.
 * @param {string|null} staffName - The name of the staff member to find subjects for.
 * @returns {Promise<object|Array>} A single subject object or an array of subjects.
 */
const getSubjectStaffAssignment = async (subjectName, staffName) => {
    if (subjectName) {
        const subject = await Subject.findOne({ name: { $regex: new RegExp(`^${subjectName}$`, 'i') } }).select('name staff').lean();
        if (!subject) throw new Error(`Subject "${subjectName}" not found.`);
        return subject;
    }
    if (staffName) {
        const subjects = await Subject.find({ staff: { $regex: new RegExp(staffName, 'i') } }).select('name year department').lean();
        return subjects;
    }
    throw new Error("You must provide either a subject_name or a staff_name.");
};

/**
 * CATEGORY: Curriculum Management (Write Action)
 * Assigns a staff member to a subject.
 * @param {string} subjectName - The name of the subject.
 * @param {number} year - The academic year.
 * @param {string} department - The department name.
 * @param {string} staffName - The name of the staff member to assign.
 * @returns {Promise<object>} The updated subject document.
 */
const assignStaffToSubject = async (subjectName, year, department, staffName) => {
    const updatedSubject = await Subject.findOneAndUpdate(
        { name: { $regex: new RegExp(`^${subjectName}$`, 'i') }, year, department },
        { $set: { staff: staffName } },
        { new: true }
    ).lean();

    if (!updatedSubject) throw new Error(`Subject "${subjectName}" for Year ${year} ${department} not found.`);
    return updatedSubject;
};

/**
 * CATEGORY: Resource Management
 * Counts study materials uploaded by a teacher.
 * @param {string} teacherId - The unique ID of the teacher.
 * @param {string|null} subjectName - Optional: Filter by subject name.
 * @returns {Promise<number>} The count of study materials.
 */
const countStudyMaterialsByTeacher = async (teacherId, subjectName = null) => {
    const query = { teacher_id: teacherId };
    if (subjectName) {
        query.subjectName = { $regex: new RegExp(`^${subjectName}$`, 'i') };
    }
    return StudyMaterial.countDocuments(query);
};

/**
 * CATEGORY: Resource Management
 * Lists all study materials for a given year and department.
 * @param {number} year - The academic year.
 * @param {string} department - The department name.
 * @returns {Promise<Array>} A list of study materials.
 */
const listStudyMaterialsByCurriculum = async (year, department) => {
    return StudyMaterial.find({ year, department })
        .select('fileName subjectName teacher_id filePath')
        .lean();
};

/**
 * CATEGORY: Resource Management
 * Finds subjects that are missing any uploaded study materials.
 * @param {number} year - The academic year.
 * @param {string} department - The department name.
 * @returns {Promise<Array>} A list of subject names.
 */
const findSubjectsMissingStudyMaterials = async (year, department) => {
    // 1. Get all subject names for the curriculum that DO have materials.
    const subjectsWithMaterials = await StudyMaterial.distinct('subjectName', {
        year,
        department
    });

    // 2. Get all subjects for the curriculum where the name is NOT IN the list from step 1.
    const subjectsWithoutMaterials = await Subject.find({
        year,
        department,
        name: { $nin: subjectsWithMaterials }
    }).select('name').lean();
    
    return subjectsWithoutMaterials.map(s => s.name);
};


module.exports = {
    findSubjectsWithNoAssessments,
    getSubjectStaffAssignment,
    assignStaffToSubject,
    countStudyMaterialsByTeacher,
    listStudyMaterialsByCurriculum,
    findSubjectsMissingStudyMaterials,
};