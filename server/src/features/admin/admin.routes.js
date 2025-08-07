const express = require('express');
const router = express.Router();
const { getDashboardData ,handleAdminChatQuery,downloadTempCsv} = require('./admin.controller');
const { verifyToken, isAdmin } = require('../../middlewares/auth.middleware');

// GET /api/v1/admin/dashboard-data -> BFF for the dashboard page
router.get('/dashboard-data', verifyToken, isAdmin, getDashboardData);


router.post('/chatbot', verifyToken, isAdmin, handleAdminChatQuery);
router.get('/download-csv/:id', verifyToken, isAdmin, downloadTempCsv);

module.exports = router;