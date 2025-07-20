const notificationService = require('../services/notification.service');
const User = require('../models/user.model');
const Lease = require('../models/lease.model');

exports.createNotification = async (req, res) => {
  try {
    const { senderId, userId, title, message, type, link, maintenanceRequestId } = req.body;

    // Rule 1: senderId must match logged-in user
    if (senderId !== req.user.id) {
      return res.status(403).json({
        status: "fail",
        message: 'senderId does not match logged-in user.'
      });
    }

    // Find the sender
    const sender = await User.findById(senderId);
    if (!sender) {
      return res.status(404).json({
        status: "fail",
        message: 'Sender not found.'
      });
    }

    if (sender.isBlocked || sender.isDeleted) {
      return res.status(403).json({
        status: "fail",
        message: 'Your account is not allowed to send notifications.'
      });
    }

    // Special handling for maintenance request notifications
    if (type === 'MAINTENANCE_REQUEST' || type === 'MAINTENANCE_UPDATE') {
      // For maintenance notifications, we don't need to check lease relationship
      // The relationship is established through the maintenance request
      const notification = await notificationService.createNotification({
        senderId,
        userId,
        title,
        message,
        type,
        link,
        maintenanceRequestId
      });

      const io = req.app.get('io');
      if (io) {
        io.to(userId).emit('newNotification', notification);
      }

      return res.status(201).json({
        status: "success",
        data: notification
      });
    }

    // For other notification types, validate role and lease relationship
    let leaseQuery = {};

    if (sender.role?.toLowerCase() === 'landlord') {
      leaseQuery = {
        landlordId: senderId,
        tenantId: userId
      };
    } else if (sender.role?.toLowerCase() === 'tenant') {
      leaseQuery = {
        tenantId: senderId,
        landlordId: userId
      };
    } else {
      return res.status(403).json({
        status: "fail",
        message: 'Invalid user role for sending notifications.'
      });
    }

    const lease = await Lease.findOne(leaseQuery);
    if (!lease) {
      return res.status(403).json({
        status: "fail",
        message: 'No lease relationship exists between sender and recipient.'
      });
    }

    // Create the notification
    const notification = await notificationService.createNotification({
      senderId,
      userId,
      title,
      message,
      type,
      link
    });

    const io = req.app.get('io');

    if (io) {
      io.to(userId).emit('newNotification', notification);
    }

    res.status(201).json({
      status: "success",
      data: notification
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: 'Server error while creating notification.'
    });
  }
};

// GET /api/notifications/:userId
exports.getUserNotifications = async (req, res) => {
  try {
     console.log("🔎 requestedUserId:", req.params.userId);
    console.log("🔎 logged-in userId:", req.user._id.toString());
    console.log("🔎 logged-in user role:", req.user.role);

    const requestedUserId = req.params.userId;

    if (requestedUserId !== req.user._id.toString() && req.user.role !== 'admin') {
       console.log("❌ Forbidden access.");
      return res.status(403).json({
        status: "fail",
        message: 'Not authorized to access these notifications.'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await notificationService.getUserNotifications(
      requestedUserId,
      page,
      limit
    );
    console.log("✅ Notifications fetched:", result.data?.length);
    res.status(200).json({
      status: "success",
      data: result.data
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: 'Server error while fetching notifications.'
    });
  }
};


// GET /api/notifications/sender/:landlordId
exports.getSentNotifications = async (req, res) => {
  try {
    const landlordId = req.params.landlordId;

    if (req.user.role !== 'landlord' && req.user.role !== 'admin') {
      return res.status(403).json({
        status: "fail",
        message: 'Only landlords or admins can view sent notifications.'
      });
    }

    if (req.user.role === 'landlord' && landlordId !== req.user.id) {
      return res.status(403).json({
        status: "fail",
        message: 'Landlords can only view their own sent notifications.'
      });
    }

    const notifications = await notificationService.getSentNotifications(landlordId);

    res.status(200).json({
      status: "success",
      data: notifications.data
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: 'Server error while fetching sent notifications.'
    });
  }
};

// PATCH /api/notifications/:id/read
exports.markAsRead = async (req, res) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id);

    if (!notification) {
      return res.status(404).json({
        status: "fail",
        message: 'Notification not found.'
      });
    }

    if (notification.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: "fail",
        message: 'Not authorized to update this notification.'
      });
    }

    res.status(200).json({
      status: "success",
      data: notification
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: 'Server error while updating notification.'
    });
  }
};

// DELETE /api/notifications/:id
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await notificationService.getNotificationById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        status: "fail",
        message: 'Notification not found.'
      });
    }

    if (notification.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: "fail",
        message: 'Not authorized to delete this notification.'
      });
    }

    await notificationService.deleteNotification(req.params.id);

    res.status(200).json({
      status: "success",
      message: 'Notification deleted.'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: 'Server error while deleting notification.'
    });
  }
};

// PATCH /api/notifications/mark-all-read/:userId
exports.markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: "fail",
        message: 'Not authorized to mark notifications for this user.'
      });
    }

    const result = await notificationService.markAllAsRead(userId);
    res.status(200).json({
      status: "success",
      message: `${result.modifiedCount} notifications marked as read.`
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: 'Server error while marking notifications as read.'
    });
  }
};
