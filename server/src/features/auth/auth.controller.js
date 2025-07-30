const authService = require('./auth.service');

// A helper to format user details for the client
const _formatUserDetails = (user, role) => {
    console.log("🧩 User object inside _formatUserDetails:", user);

    const details = {
        role,
        name: user.name,
        email: user.email,
        photo_url: user.photo_url,
    };

    if (role === 'student') {
        details.student_id = user.student_id;
        details.department = user.department;
    } else if (role === 'teacher') {
        details.teacher_id = user.teacher_id;
        details.department = user.department;
        details.subjects = user.subjects; // ✅
        console.log("📌 Extracted teacher subjects:", user.subjects);
    }

    return details;
};



const googleLogin = async (req, res, next) => {
  try {
    const { email, photo_url } = req.body;
    console.log("🔹 Google Login Attempt:", { email });

    const { token, user, role } = await authService.loginWithGoogle(email);

    const userDetails = _formatUserDetails(user, role);

    console.log("✅ Google Login Successful");
    res.status(200).json({ token, userDetails });
  } catch (error) {
    console.error("❌ Error in googleLogin controller:", error.message);
    // Pass a more user-friendly error to the client
    res.status(400).json({ msg: error.message });
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    console.log('🔹 Login attempt:', { email });

    const { token, user, role } = await authService.loginWithCredentials(email, password);
    
    const userDetails = _formatUserDetails(user, role);
    
    console.log('✅ Login successful:', { email, role });
    res.status(200).json({ token, userDetails });
  } catch (error) {
    console.error('❌ Error in loginUser controller:', error.message);
    res.status(400).json({ msg: error.message });
  }
};

// The logic from your old GET /user route is now in middleware + this controller
const getUserDetails = async (req, res) => {
    // The authMiddleware has already verified the token and attached user info to req.user
    // Now we just need to send it back.
    // Note: The service layer could be used here to fetch fresh user data if needed.
    // For now, we assume the data in the token is sufficient.
    res.json(req.user.userDetails);
};


module.exports = {
  googleLogin,
  loginUser,
  getUserDetails,
};