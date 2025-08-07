const notificationService = require('./notifications.service');

const create = async (req, res) => {
    try {
        const newNotification = await notificationService.createNotification(req.body);
        res.status(201).json(newNotification);
    } catch (error) {
        res.status(500).json({ message: 'Error creating notification.', error: error.message });
    }
};

const getAll = async (req, res) => {
    try {
        const notifications = await notificationService.getAllNotifications();
        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching notifications.', error: error.message });
    }
};

const update = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedNotification = await notificationService.updateNotificationById(id, req.body);
        res.status(200).json({ message: 'Notification updated successfully.', notification: updatedNotification });
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

const remove = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await notificationService.deleteNotificationById(id);
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

module.exports = { create, getAll, update, remove };