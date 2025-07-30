const jwt = require('jsonwebtoken');

/**
 * Verifies a JWT token from the Authorization header.
 * Attaches the decoded payload to req.user if the token is valid.
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      // Use your actual secret key from .env
      const decoded = jwt.verify(token, process.env.JWT_SECRET); // 👈 Make sure this is defined
      
      // Attach the entire decoded payload to the request object
      req.user = decoded; 
      
      next();
    } catch (error) {
      console.error('JWT Verification Error:', error.message);
      return res.status(401).json({ message: 'Not authorized, token is invalid or expired.' });
    }
  } else {
    return res.status(401).json({ message: 'Not authorized, no token provided.' });
  }
};

/**
 * A generic authorization middleware factory.
 * It creates a middleware that checks if the user's role is included in the list of allowed roles.
 * @param {...string} allowedRoles - A list of role strings (e.g., 'student', 'admin').
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // req.user is expected to be attached by the verifyToken middleware first
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: 'Access denied. User role not found in token.' });
    }
    
    const userRole = req.user.role;
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        message: `Forbidden. Your role ('${userRole}') is not authorized to access this resource.` 
      });
    }
    
    // If the role is allowed, proceed to the next middleware or route handler
    next();
  };
};


const isStudent = authorize('student');


const isTeacher = authorize('teacher');


const isAdmin = authorize('admin');




// Export all functions for use in your route files
module.exports = {
  verifyToken,
  authorize, // The generic factory if you need it
  isStudent,
  isTeacher,
  isAdmin,
};