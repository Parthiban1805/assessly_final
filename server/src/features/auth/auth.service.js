const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Student, Teacher, Admin } = require('../users/users.model'); // Import grouped models

/**
 * A private helper function to find a user across all role collections.
 * It's reusable and keeps the main logic clean.
 * @param {string} email - The user's email.
 * @returns {Promise<{user: object, role: string}|null>}
 */
const _findUserAndRole = async (email) => {
  console.log(`🔍 Searching for user with email: ${email}`);
  
  let user = await Student.findOne({ email });
  if (user) {
    console.log("✅ Found in Student collection.");
    return { user, role: 'student' };
  }

  user = await Teacher.findOne({ email });
  if (user) {
    console.log("✅ Found in Teacher collection.");
    return { user, role: 'teacher' };
  }

  user = await Admin.findOne({ email });
  if (user) {
    console.log("✅ Found in Admin collection.");
    return { user, role: 'admin' };
  }

  console.log("❌ No user found.");
  return null;
};

/**
 * Generates a JWT token for a given user payload.
 * @param {object} user - The user object from the database.
 * @param {string} role - The user's role.
 * @returns {string} - The JWT token.
 */
const _generateToken = (user, role) => {
    const payload = {
        role: role,
        userDetails: {
            id: user._id,
            name: user.name,
            email: user.email,
            photo_url: user.photo_url,
            ...(role === 'student' && {
                student_id: user.student_id,
                department: user.department,
                year: user.year,
            }),
            ...(role === 'teacher' && {
                teacher_id: user.teacher_id,
                department: user.department,
                subjects: user.subjects // ✅ Add this line
            })
        },
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
    };

    return jwt.sign(payload, process.env.JWT_SECRET);
};

const loginWithGoogle = async (email) => {
  const result = await _findUserAndRole(email);

  if (!result) {
    throw new Error('No user found with this email');
  }

  const { user, role } = result;
  const token = _generateToken(user, role);
  
  // Return the data the controller needs to build the final response
  return { token, user, role };
};

const loginWithCredentials = async (email, password) => {
  const result = await _findUserAndRole(email);

  if (!result) {
    throw new Error('Invalid email or password');
  }

  const { user, role } = result;

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error('Invalid email or password');
  }

  const token = _generateToken(user, role);
  
  return { token, user, role };
};

module.exports = {
  loginWithGoogle,
  loginWithCredentials,
};