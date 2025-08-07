const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
// FIX: Import the 'verifyToken' function specifically
const { verifyToken } = require('../../middlewares/auth.middleware');

// @route   POST api/auth/google-login
// @desc    Authenticate user via Google
// @access  Public
router.post('/google-login', authController.googleLogin);

// @route   POST api/auth/login
// @desc    Authenticate user with email/password
// @access  Public
router.post('/login', authController.loginUser);

// @route   GET api/auth/user
// @desc    Get user data from token
// @access  Private (requires a token)
// FIX: Use the imported 'verifyToken' function as the middleware
router.get('/user', verifyToken, authController.getUserDetails);

module.exports = router;