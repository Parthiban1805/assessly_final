const express = require('express');
const router = express.Router();
const controller = require('./notifications.controller');
const { verifyToken, isAdmin } = require('../../middlewares/auth.middleware');

// All routes in this file are protected and for admins only
router.use(verifyToken, isAdmin);

// POST /api/v1/notifications/ -> Create a new notification
router.post('/', controller.create);

// GET /api/v1/notifications/ -> Get all notifications
router.get('/', controller.getAll);

// PUT /api/v1/notifications/:id -> Update a notification
router.put('/:id', controller.update);

// DELETE /api/v1/notifications/:id -> Delete a notification
router.delete('/:id', controller.remove);

module.exports = router;