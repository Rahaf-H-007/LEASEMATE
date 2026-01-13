const Chat = require('../models/chat.model');
const Message = require('../models/message.model');
const User = require('../models/user.model');
const Unit = require('../models/unit.model');

// إنشاء أو جلب محادثة بين مستأجر ومالك لوحدة معينة
exports.getOrCreateChat = async (req, res) => {
  const { tenantId, landlordId, unitId } = req.body;
  let chat = await Chat.findOne({ tenant: tenantId, landlord: landlordId, unit: unitId });
  if (!chat) {
    chat = await Chat.create({ tenant: tenantId, landlord: landlordId, unit: unitId });
  }
  res.json(chat);
};

// جلب كل محادثات المستأجر مع بيانات المالك والوحدة
exports.getTenantChats = async (req, res) => {
  const { tenantId } = req.params;
  const chats = await Chat.find({ tenant: tenantId })
    .populate('landlord', 'name')
    .populate('unit', 'name')
    .sort('-lastMessageAt')
    .lean();
  // احسب عدد الرسائل غير المقروءة لكل محادثة
  const chatIds = chats.map(c => c._id);
  const unreadCounts = await Message.aggregate([
    { $match: { chat: { $in: chatIds }, sender: { $ne: tenantId }, read: false } },
    { $group: { _id: '$chat', count: { $sum: 1 } } }
  ]);
  const unreadMap = Object.fromEntries(unreadCounts.map(u => [u._id.toString(), u.count]));
  // جلب آخر رسالة لكل محادثة
  const lastMessages = await Message.aggregate([
    { $match: { chat: { $in: chatIds } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$chat', sender: { $first: '$sender' } } }
  ]);
  const lastSenderMap = Object.fromEntries(lastMessages.map(m => [m._id.toString(), m.sender]));
  const chatsWithUnread = chats.map(chat => ({
    ...chat,
    unreadCount: unreadMap[chat._id.toString()] || 0,
    lastMessageSenderId: lastSenderMap[chat._id.toString()] || null
  }));
  res.json(chatsWithUnread);
};

// جلب كل الرسائل في محادثة
exports.getMessages = async (req, res) => {
  const { chatId } = req.params;
  const messages = await Message.find({ chat: chatId }).sort('createdAt');
  res.json(messages);
};

// إرسال رسالة جديدة
exports.sendMessage = async (req, res) => {
  const { chatId } = req.params;
  const { senderId, text } = req.body;
  const message = await Message.create({ chat: chatId, sender: senderId, text });
  await Chat.findByIdAndUpdate(chatId, { lastMessage: text, lastMessageAt: new Date() });
  res.json(message);
};

// تحديث حالة الرسائل (مقروءة)
exports.markMessagesAsRead = async (req, res) => {
  const { chatId } = req.params;
  const { userId } = req.body;
  await Message.updateMany({ chat: chatId, sender: { $ne: userId }, read: false }, { read: true });
  res.json({ success: true });
};

// جلب كل محادثات المالك مع بيانات المستأجر والوحدة
exports.getLandlordChats = async (req, res) => {
  const { landlordId } = req.params;
  const chats = await Chat.find({ landlord: landlordId })
    .populate('tenant', 'name')
    .populate('unit', 'name')
    .sort('-lastMessageAt')
    .lean();
  // احسب عدد الرسائل غير المقروءة لكل محادثة
  const chatIds = chats.map(c => c._id);
  const unreadCounts = await Message.aggregate([
    { $match: { chat: { $in: chatIds }, sender: { $ne: landlordId }, read: false } },
    { $group: { _id: '$chat', count: { $sum: 1 } } }
  ]);
  const unreadMap = Object.fromEntries(unreadCounts.map(u => [u._id.toString(), u.count]));
  // جلب آخر رسالة لكل محادثة
  const lastMessages = await Message.aggregate([
    { $match: { chat: { $in: chatIds } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$chat', sender: { $first: '$sender' } } }
  ]);
  const lastSenderMap = Object.fromEntries(lastMessages.map(m => [m._id.toString(), m.sender]));
  const chatsWithUnread = chats.map(chat => ({
    ...chat,
    unreadCount: unreadMap[chat._id.toString()] || 0,
    lastMessageSenderId: lastSenderMap[chat._id.toString()] || null
  }));
  res.json(chatsWithUnread);
};

// إنشاء شات جديد مع أول رسالة
exports.createChatWithFirstMessage = async (req, res) => {
  try {
    const { tenantId, landlordId, unitId, senderId, text } = req.body;
    
    console.log('Creating chat with data:', { tenantId, landlordId, unitId, senderId, text: text?.substring(0, 50) });
    
    // تحقق من البيانات المطلوبة - unitId يمكن أن يكون 'profile' للشات من البروفايل
    if (!tenantId || !landlordId || !senderId || !text) {
      console.log('Missing required fields:', { tenantId: !!tenantId, landlordId: !!landlordId, senderId: !!senderId, text: !!text });
      return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    }
    
    // تحقق ألا يوجد شات سابق
    let chatQuery = { tenant: tenantId, landlord: landlordId };
    if (unitId && unitId !== 'profile') {
      chatQuery.unit = unitId;
    } else {
      chatQuery.unit = { $exists: false };
    }
    
    console.log('Checking for existing chat with query:', chatQuery);
    
    let chat = await Chat.findOne(chatQuery);
    if (chat) {
      console.log('Chat already exists:', chat._id);
      return res.status(400).json({ error: 'المحادثة موجودة بالفعل' });
    }
    
    // أنشئ الشات
    const chatData = { 
      tenant: tenantId, 
      landlord: landlordId, 
      lastMessage: text, 
      lastMessageAt: new Date() 
    };
    
    // إضافة unit فقط إذا كان له قيمة حقيقية وليس 'profile'
    if (unitId && unitId !== 'profile') {
      chatData.unit = unitId;
    }
    
    console.log('Creating chat with data:', chatData);
    
    chat = await Chat.create(chatData);
    console.log('Chat created successfully:', chat._id);
    
    // أضف أول رسالة
    const message = await Message.create({ chat: chat._id, sender: senderId, text });
    console.log('Message created successfully:', message._id);
    
    res.json({ chatId: chat._id, message });
  } catch (error) {
    console.error('Error creating chat with message:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء إنشاء المحادثة' });
  }
};

// التحقق من وجود محادثة بين مستأجر ومالك لوحدة معينة
exports.checkChatExists = async (req, res) => {
  try {
    const { tenantId, landlordId, unitId } = req.params;
    
    if (!tenantId || !landlordId || !unitId) {
      return res.status(400).json({ error: 'جميع المعاملات مطلوبة' });
    }

    let chatQuery = { tenant: tenantId, landlord: landlordId };
    if (unitId && unitId !== 'profile') {
      chatQuery.unit = unitId;
    } else {
      chatQuery.unit = { $exists: false };
    }
    
    const chat = await Chat.findOne(chatQuery);

    if (chat) {
      // تحقق من وجود رسائل في المحادثة
      const messageCount = await Message.countDocuments({ chat: chat._id });
      
      res.json({ 
        exists: true, 
        chatId: chat._id,
        hasMessages: messageCount > 0,
        messageCount 
      });
    } else {
      res.json({ 
        exists: false, 
        chatId: null,
        hasMessages: false,
        messageCount: 0 
      });
    }
  } catch (error) {
    console.error('Error checking chat existence:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء التحقق من وجود المحادثة' });
  }
};

// البحث عن محادثة عامة موجودة بين مستخدمين (بدون وحدة)
exports.findGeneralChat = async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;
    
    if (!userId1 || !userId2) {
      return res.status(400).json({ error: 'معرفات المستخدمين مطلوبة' });
    }

    // البحث عن محادثة عامة (بدون وحدة) بين المستخدمين
    // يمكن أن يكون أي منهما مستأجر أو مالك
    const chat = await Chat.findOne({
      $or: [
        { tenant: userId1, landlord: userId2, unit: { $exists: false } },
        { tenant: userId2, landlord: userId1, unit: { $exists: false } }
      ]
    });

    if (chat) {
      // تحقق من وجود رسائل في المحادثة
      const messageCount = await Message.countDocuments({ chat: chat._id });
      
      res.json({ 
        exists: true, 
        chatId: chat._id,
        hasMessages: messageCount > 0,
        messageCount,
        tenant: chat.tenant,
        landlord: chat.landlord
      });
    } else {
      res.json({ 
        exists: false, 
        chatId: null,
        hasMessages: false,
        messageCount: 0,
        tenant: null,
        landlord: null
      });
    }
  } catch (error) {
    console.error('Error finding general chat:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء البحث عن المحادثة العامة' });
  }
};  