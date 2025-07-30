const ImportantNotification = require('./notifications.model');
const mongoose = require('mongoose');

const createNotification = async (notificationData) => {
    const newNotification = new ImportantNotification(notificationData);
    return await newNotification.save();
};

const getAllNotifications = async () => {
    return await ImportantNotification.find().sort({ createdAt: -1 }).lean();
};

const updateNotificationById = async (id, updateData) => {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid notification ID.');
    const updated = await ImportantNotification.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) throw new Error('Notification not found.');
    return updated;
};

const deleteNotificationById = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid notification ID.');
    const deleted = await ImportantNotification.findByIdAndDelete(id);
    if (!deleted) throw new Error('Notification not found.');
    return { message: 'Notification deleted successfully.' };
};

/**
 * Gets a single notification's details by its MongoDB ID.
 * @param {string} notificationId - The MongoDB ObjectId of the notification.
 * @returns {Promise<object>} The notification document.
 */
const getNotificationById = async (notificationId) => {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) throw new Error('Invalid notification ID format.');
    const notification = await ImportantNotification.findById(notificationId).lean();
    if (!notification) {
        throw new Error('Notification not found.');
    }
    return notification;
};
module.exports = {
    createNotification,
    getAllNotifications,
    updateNotificationById,
    deleteNotificationById,
    getNotificationById,
};