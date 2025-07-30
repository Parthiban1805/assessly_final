const express = require('express');
const router = express.Router();
const { getSetting, updateSetting } = require('./settings.controller');
const { verifyToken, isAdmin } = require('../../middlewares/auth.middleware');

// A single endpoint for the 'DisplayAnswers' setting
router.get('/displayanswers', verifyToken, getSetting); // All users can read the setting
router.put('/displayanswers', verifyToken, isAdmin, updateSetting); // Only admins can change it

module.exports = router;