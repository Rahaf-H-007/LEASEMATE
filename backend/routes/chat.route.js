const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');

// إنشاء أو جلب محادثة
router.post('/get-or-create', chatController.getOrCreateChat);
// إنشاء شات جديد مع أول رسالة
router.post('/create-with-message', chatController.createChatWithFirstMessage);
// التحقق من وجود محادثة
router.get('/check/:tenantId/:landlordId/:unitId', chatController.checkChatExists);
// البحث عن محادثة عامة بين مستخدمين
router.get('/find-general/:userId1/:userId2', chatController.findGeneralChat);
// جلب رسائل محادثة
router.get('/:chatId/messages', chatController.getMessages);
// إرسال رسالة
router.post('/:chatId/messages', chatController.sendMessage);
// تحديث حالة الرسائل (مقروءة)
router.post('/:chatId/read', chatController.markMessagesAsRead);
// جلب محادثات المالك
router.get('/landlord/:landlordId', chatController.getLandlordChats);
// جلب محادثات المستأجر
router.get('/tenant/:tenantId', chatController.getTenantChats);

module.exports = router; 