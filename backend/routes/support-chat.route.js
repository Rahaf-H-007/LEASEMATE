const express = require('express');
const router = express.Router();
const supportChatController = require('../controllers/support-chat.controller');
const { protect } = require('../middlewares/auth.middleware');
const { isAdmin } = require('../middlewares/admin.middleware');

// إنشاء شات دعم جديد
router.post('/create', protect, supportChatController.createSupportChat);

// جلب شات دعم المستخدم
router.get('/user/:userId', protect, supportChatController.getUserSupportChat);

// جلب جميع شاتات الدعم للمشرف (يجب أن يكون قبل /:chatId routes)
router.get('/admin', protect, isAdmin, supportChatController.getAdminSupportChats);

// جلب رسائل شات الدعم
router.get('/:chatId/messages', protect, supportChatController.getSupportChatMessages);

// إرسال رسالة في شات الدعم
router.post('/:chatId/messages', protect, supportChatController.sendSupportMessage);

// تحديث حالة الرسائل كمقروءة
router.post('/:chatId/read', protect, supportChatController.markSupportMessagesAsRead);

module.exports = router; 