const SupportChat = require("../models/support-chat.model");
const SupportMessage = require("../models/support-message.model");
const User = require("../models/user.model");

// إنشاء شات دعم جديد مع أول رسالة
const createSupportChat = async (req, res) => {
  try {
    const { userId, text } = req.body;
    console.log("🟢 Creating support chat:", { userId, text });

    if (!userId) {
      return res.status(400).json({ error: "معرف المستخدم مطلوب" });
    }

    // تحقق من وجود شات دعم سابق للمستخدم
    let supportChat = await SupportChat.findOne({
      user: userId,
      isActive: true,
    });

    if (!supportChat) {
      // إنشاء شات دعم جديد
      supportChat = await SupportChat.create({
        user: userId,
        lastMessage: text || '',
        lastMessageAt: new Date(),
      });
      console.log("✅ New support chat created:", supportChat._id);
    } else {
      console.log("✅ Existing support chat found:", supportChat._id);
    }

    // إضافة الرسالة فقط إذا كان هناك نص
    let message = null;
    if (text && text.trim()) {
      message = await SupportMessage.create({
        supportChat: supportChat._id,
        sender: userId,
        text: text,
      });
      console.log("✅ Message created:", message._id);

      // تحديث آخر رسالة في الشات
      await SupportChat.findByIdAndUpdate(supportChat._id, {
        lastMessage: text,
        lastMessageAt: new Date(),
      });
    }

    // Socket event is now handled by frontend, no need to emit here
    // The frontend will emit the socket event directly

    res.json({
      chatId: supportChat._id,
      message: message ? {
        _id: message._id,
        sender: message.sender,
        text: message.text,
        createdAt: message.createdAt,
      } : null,
    });
  } catch (error) {
    console.error("❌ Error creating support chat:", error);
    res.status(500).json({ error: "حدث خطأ أثناء إنشاء شات الدعم" });
  }
};

// جلب شات دعم المستخدم
const getUserSupportChat = async (req, res) => {
  try {
    const { userId } = req.params;

    const supportChat = await SupportChat.findOne({
      user: userId,
      isActive: true,
    });

    if (supportChat) {
      res.json({ chatId: supportChat._id });
    } else {
      res.json({ chatId: null });
    }
  } catch (error) {
    console.error("Error getting user support chat:", error);
    res.status(500).json({ error: "حدث خطأ أثناء جلب شات الدعم" });
  }
};

// جلب رسائل شات الدعم
const getSupportChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    console.log("🟢 Getting support chat messages for chatId:", chatId);

    // Verify chat exists first
    const chatExists = await SupportChat.findById(chatId);
    if (!chatExists) {
      console.error("❌ Chat not found:", chatId);
      return res.status(404).json({ error: "الشات غير موجود" });
    }

    console.log("✅ Chat found, fetching messages...");

    const messages = await SupportMessage.find({ supportChat: chatId })
      .populate("sender", "name role")
      .sort("createdAt");

    console.log("✅ Found messages:", messages.length, "for chat:", chatId);
    console.log(
      "📝 Messages:",
      messages.map((m) => ({
        id: m._id,
        sender: m.sender,
        text: m.text.substring(0, 50),
      }))
    );

    res.json(messages);
  } catch (error) {
    console.error("❌ Error getting support chat messages:", error);
    res.status(500).json({ error: "حدث خطأ أثناء جلب الرسائل" });
  }
};

// إرسال رسالة في شات الدعم
const sendSupportMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { senderId, text } = req.body;
    console.log("🟢 Sending support message:", { chatId, senderId, text });

    if (!senderId || !text) {
      console.error("❌ Missing required fields:", { senderId, text });
      return res.status(400).json({ error: "جميع الحقول مطلوبة" });
    }

    // Verify chat exists
    const chatExists = await SupportChat.findById(chatId);
    if (!chatExists) {
      console.error("❌ Chat not found:", chatId);
      return res.status(404).json({ error: "الشات غير موجود" });
    }

    console.log("💾 Creating support message...");

    // إنشاء الرسالة
    const message = await SupportMessage.create({
      supportChat: chatId,
      sender: senderId,
      text: text,
    });
    console.log("✅ Support message created:", message._id);

    // تحديث آخر رسالة في الشات
    await SupportChat.findByIdAndUpdate(chatId, {
      lastMessage: text,
      lastMessageAt: new Date(),
    });
    console.log("✅ Chat updated with last message");

    // جلب الرسالة مع بيانات المرسل
    const populatedMessage = await SupportMessage.findById(
      message._id
    ).populate("sender", "name role");

    console.log("✅ Support message sent successfully:", populatedMessage._id);

    // Socket event is now handled by frontend, no need to emit here
    // The frontend will emit the socket event directly

    res.json({
      _id: populatedMessage._id,
      sender: populatedMessage.sender,
      text: populatedMessage.text,
      createdAt: populatedMessage.createdAt,
    });
  } catch (error) {
    console.error("❌ Error sending support message:", error);
    res.status(500).json({ error: "حدث خطأ أثناء إرسال الرسالة" });
  }
};
// جلب جميع شاتات الدعم للمشرف
const getAdminSupportChats = async (req, res) => {
  try {
    console.log("🟢 Getting admin support chats for user:", req.user._id);

    const supportChats = await SupportChat.find({ isActive: true })
      .populate("user", "name role")
      .sort("-lastMessageAt")
      .lean();

    console.log("✅ Found support chats:", supportChats.length);

    // احسب عدد الرسائل غير المقروءة لكل شات
    const chatIds = supportChats.map((chat) => chat._id);
    const unreadCounts = await SupportMessage.aggregate([
      {
        $match: {
          supportChat: { $in: chatIds },
          sender: { $ne: req.user._id },
          read: false,
        },
      },
      { $group: { _id: "$supportChat", count: { $sum: 1 } } },
    ]);

    const unreadMap = Object.fromEntries(
      unreadCounts.map((u) => [u._id.toString(), u.count])
    );

    const chatsWithUnread = supportChats.map((chat) => ({
      ...chat,
      unreadCount: unreadMap[chat._id.toString()] || 0,
    }));

    console.log("✅ Returning support chats with unread counts");
    res.json(chatsWithUnread);
  } catch (error) {
    console.error("❌ Error getting admin support chats:", error);
    res.status(500).json({ error: "حدث خطأ أثناء جلب شاتات الدعم" });
  }
};

// تحديث حالة الرسائل كمقروءة
const markSupportMessagesAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId } = req.body;

    await SupportMessage.updateMany(
      {
        supportChat: chatId,
        sender: { $ne: userId },
        read: false,
      },
      { read: true }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Error marking support messages as read:", error);
    res.status(500).json({ error: "حدث خطأ أثناء تحديث حالة الرسائل" });
  }
};

module.exports = {
  createSupportChat,
  getUserSupportChat,
  getSupportChatMessages,
  sendSupportMessage,
  getAdminSupportChats,
  markSupportMessagesAsRead,
};
