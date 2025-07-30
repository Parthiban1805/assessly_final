const userService = require('./users.service');

// A single, unified controller for getting user details.
const getDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const { type } = req.query; // Expects ?type=student or ?type=teacher

        let userDetails;
        if (type === 'student') {
            userDetails = await userService.getStudentDetails(id);
        } else if (type === 'teacher') {
            userDetails = await userService.getTeacherDetails(id);
        } else {
            return res.status(400).json({ message: 'A valid "type" query parameter is required (e.g., ?type=student).' });
        }
        
        res.status(200).json(userDetails);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message || 'Server error' });
    }
};

// A single controller for updating a student's club.
const updateClub = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { club } = req.body;
    const updatedStudent = await userService.updateStudentClub(studentId, club);
    res.status(200).json({
      message: 'Club updated successfully.',
      student: updatedStudent,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Server error' });
  }
};

// --- STUDENT CRUD CONTROLLERS (NEW) ---
const createStudent = async (req, res) => {
    try {
        const student = await userService.createStudent(req.body);
        res.status(201).json({ message: 'Student created successfully.', student });
    } catch (error) {
        res.status(400).json({ message: error.message || 'Failed to create student.' });
    }
};

const updateStudent = async (req, res) => {
    try {
        const { id } = req.params; // This is the mongo _id
        const updatedStudent = await userService.updateStudent(id, req.body);
        res.status(200).json({ message: 'Student updated successfully.', student: updatedStudent });
    } catch (error) {
        res.status(error.statusCode || 400).json({ message: error.message });
    }
};

const deleteStudent = async (req, res) => {
    try {
        const { id } = req.params; // This is the mongo _id
        const result = await userService.deleteStudent(id);
        res.status(200).json(result);
    } catch (error) {
        res.status(error.statusCode || 400).json({ message: error.message });
    }
};

// --- TEACHER CRUD CONTROLLERS (NEW) ---
const createTeacher = async (req, res) => {
    try {
        const teacher = await userService.createTeacher(req.body);
        res.status(201).json({ message: 'Teacher created successfully.', teacher });
    } catch (error) {
        res.status(400).json({ message: error.message || 'Failed to create teacher.' });
    }
};

const updateTeacher = async (req, res) => {
    try {
        const { id } = req.params; // This is the mongo _id
        const updatedTeacher = await userService.updateTeacher(id, req.body);
        res.status(200).json({ message: 'Teacher updated successfully.', teacher: updatedTeacher });
    } catch (error) {
        res.status(error.statusCode || 400).json({ message: error.message });
    }
};

const deleteTeacher = async (req, res) => {
    try {
        const { id } = req.params; // This is the mongo _id
        const result = await userService.deleteTeacher(id);
        res.status(200).json(result);
    } catch (error) {
        res.status(error.statusCode || 400).json({ message: error.message });
    }
};


// **THE FIX:** Export a single object with all controller functions.
module.exports = {
    getDetails,
    updateClub,
    createStudent,
    updateStudent,
    deleteStudent,
    createTeacher,
    updateTeacher,
    deleteTeacher,
};