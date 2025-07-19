const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { protect } = require('../middlewares/auth.middleware');
const { allowRoles } = require('../middlewares/role.middleware');
const { isAdmin } = require('../middlewares/admin.middleware');

// RESTful routes
router.post('/',protect ,notificationController.createNotification);
router.get('/sender/:landlordId',protect, notificationController.getSentNotifications);
router.get('/:userId',protect, notificationController.getUserNotifications);
router.patch('/:id/read',protect, notificationController.markAsRead);
router.patch('/mark-all-read/:userId',protect, notificationController.markAllAsRead);
router.delete('/:id',protect,isAdmin,notificationController.deleteNotification);

module.exports = router;
