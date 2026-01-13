const Notification = require('../models/notification.model');

// Create a new notification
exports.createNotification = async (data) => {
  const notification = new Notification(data);
  return await notification.save();
};

// Get all notifications for a specific user
exports.getUserNotifications = async (userId) => {
  const notifications = await Notification.find({ userId })
    .populate('senderId', 'name avatarUrl')
    .sort({ createdAt: -1 });

  return {
    data: notifications,
    total: notifications.length
  };
};

// Get sent notifications by a landlord
exports.getSentNotifications = async (landlordId) => {
  return await Notification.find({ senderId: landlordId })
    .sort({ createdAt: -1 })
    .populate('userId', 'name avatarUrl') // optional: who the message was sent to
    .lean();
};

// Mark a single notification as read
exports.markAsRead = async (id) => {
  return await Notification.findByIdAndUpdate(
    id,
    { isRead: true },
    { new: true }
  );
};

// Mark all notifications for a user as read
exports.markAllAsRead = async (userId) => {
  return await Notification.updateMany(
    { userId, isRead: false },
    { isRead: true }
  );
};

// Delete a single notification
exports.deleteNotification = async (id) => {
  return await Notification.findByIdAndDelete(id);
};

// Get a notification by ID (used for security checks)
exports.getNotificationById = async (id) => {
  return await Notification.findById(id);
};
