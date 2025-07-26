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
    // تحقق من البيانات المطلوبة
    if (!tenantId || !landlordId || !unitId || !senderId || !text) {
      return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    }
    // تحقق ألا يوجد شات سابق
    let chat = await Chat.findOne({ tenant: tenantId, landlord: landlordId, unit: unitId });
    if (chat) {
      return res.status(400).json({ error: 'المحادثة موجودة بالفعل' });
    }
    // أنشئ الشات
    chat = await Chat.create({ tenant: tenantId, landlord: landlordId, unit: unitId, lastMessage: text, lastMessageAt: new Date() });
    // أضف أول رسالة
    const message = await Message.create({ chat: chat._id, sender: senderId, text });
    res.json({ chatId: chat._id, message });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ أثناء إنشاء المحادثة' });
  }
};  