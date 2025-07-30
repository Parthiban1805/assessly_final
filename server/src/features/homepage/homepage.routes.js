const express = require('express');
const router = express.Router();
const { getHomePageData } = require('./homepage.controller');
const { verifyToken, isStudent } = require('../../middlewares/auth.middleware');

// Defines the single endpoint to get all data for the homepage
router.get('/data', verifyToken, isStudent, getHomePageData);

module.exports = router;