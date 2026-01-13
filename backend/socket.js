const Notification = require("./models/notification.model");

const onlineUsers = {};

function setupSocket(io) {
  io.on('connection', (socket) => {
    // console.log("✅ Socket connected:", socket.id); // Commented to reduce log spam

    socket.on('join', async (userId) => {
      try {
        // console.log("📌 User joined:", userId); // Commented to reduce log spam
        onlineUsers[userId] = socket.id;
        
        // Join a room with userId for targeted notifications
        socket.join(userId);
        // console.log("🏠 User joined room:", userId);
        // console.log("📊 Total online users:", Object.keys(onlineUsers).length);

        // Fetch unread notifications from DB:
        const unread = await Notification.find({
          userId: userId,
          isRead: false,
        }).sort({ createdAt: -1 });

        // console.log(`📧 Found ${unread.length} unread notifications for user ${userId}`);

        // Send them via socket:
        unread.forEach((notif) => {
          socket.emit("newNotification", notif);
        });
      } catch (error) {
        console.error("❌ Error in socket join:", error);
      }
    });

    socket.on('disconnect', () => {
      // console.log("❌ Socket disconnected:", socket.id); // Commented to reduce log spam
      for (let id in onlineUsers) {
        if (onlineUsers[id] === socket.id) {
          delete onlineUsers[id];
          // console.log(`👤 User ${id} removed from online users`);
          break;
        }
      }
    });

    socket.on('error', (error) => {
      console.error("❌ Socket error:", error);
    });
    
    // --- Chat Events ---
    socket.on('joinChat', (chatId) => {
      socket.join(chatId);
      // console.log(`🟢 User joined chat room: ${chatId}`);
    });

    socket.on('sendMessage', async (data) => {
      // data: { chatId, senderId, receiverId, text }
      const { chatId, senderId, receiverId, text } = data;
      // بث الرسالة للطرفين في روم الشات مع تمرير receiverId
      io.to(chatId).emit('newMessage', { chatId, senderId: String(senderId), receiverId: String(receiverId), text });
      // إشعار المالك (أو المستأجر) في الـNavbar
      io.to(receiverId).emit('newChatMessage', { chatId, from: senderId, text });
    });

    // Support Chat Events
    socket.on('joinSupportChat', (chatId) => {
      socket.join(`support-${chatId}`);
      console.log(`🟢 User joined support chat room: ${chatId}`);
    });

    socket.on('sendSupportMessage', async (data) => {
      // data: { chatId, senderId, text }
      const { chatId, senderId, text } = data;
      console.log(`🟢 Support message received:`, { chatId, senderId, text });
      
      // Validate data
      if (!chatId || !senderId || !text) {
        console.error('❌ Invalid message data:', { chatId, senderId, text });
        return;
      }
      
      // Save message to database first to get _id and createdAt
      try {
        const SupportMessage = require('./models/support-message.model');
        const SupportChat = require('./models/support-chat.model');
        const User = require('./models/user.model');
        const notificationService = require('./services/notification.service');
        
        console.log('💾 Saving support message to database...');
        
        // Verify chat exists
        const chatExists = await SupportChat.findById(chatId);
        if (!chatExists) {
          console.error('❌ Chat not found:', chatId);
          return;
        }
        
        // Create message in database
        const message = await SupportMessage.create({
          supportChat: chatId,
          sender: senderId,
          text: text
        });
        
        console.log('✅ Message saved to database with ID:', message._id);
        
        // Update last message in chat
        await SupportChat.findByIdAndUpdate(chatId, {
          lastMessage: text,
          lastMessageAt: new Date()
        });
        
        console.log('✅ Chat updated with last message');
        
        // Get sender info for notifications
        const sender = await User.findById(senderId);
        const chat = await SupportChat.findById(chatId).populate('user', 'name role');
        
        // Send notifications based on who sent the message
        if (sender && chat) {
          if (sender.role === 'admin') {
            // Admin sent message to user - notify user
            console.log('📧 Creating notification for user:', chat.user._id);
            const notification = await notificationService.createNotification({
              userId: chat.user._id,
              senderId: senderId,
              title: 'رسالة جديدة من فريق الدعم',
              message: 'لديك رسالة جديدة من فريق الدعم',
              type: 'SUPPORT_MESSAGE_TO_USER',
              link: '/dashboard/support-chat',
              isRead: false
            });
            
            // Emit notification to user
            const populatedNotification = await notification.populate('senderId', 'name avatarUrl');
            io.to(chat.user._id.toString()).emit('newNotification', populatedNotification);
            console.log('✅ Support notification sent to user');
          } else {
            // User sent message to admin - notify all admins
            console.log('📧 Creating notification for admins');
            
            // Get all admin users
            const admins = await User.find({ role: 'admin' });
            
            for (const admin of admins) {
              const notification = await notificationService.createNotification({
                userId: admin._id,
                senderId: senderId,
                title: 'رسالة دعم جديدة من المستخدم',
                message: `رسالة جديدة من ${sender.name} (${sender.role === 'landlord' ? 'مالك' : 'مستأجر'})`,
                type: 'SUPPORT_MESSAGE_TO_ADMIN',
                link: '/admin/dashboard?tab=support',
                isRead: false
              });
              
              // Emit notification to admin
              const populatedNotification = await notification.populate('senderId', 'name avatarUrl');
              io.to(admin._id.toString()).emit('newNotification', populatedNotification);
              console.log(`✅ Support notification sent to admin: ${admin._id}`);
            }
          }
        }
        
        // Broadcast message with database _id and createdAt
        const broadcastData = { 
          chatId, 
          senderId: String(senderId), 
          text,
          _id: message._id,
          createdAt: message.createdAt
        };
        
        console.log('📡 Broadcasting message:', broadcastData);
        io.to(`support-${chatId}`).emit('newSupportMessage', broadcastData);
        console.log(`🟢 Support message broadcasted to room: support-${chatId}`);
      } catch (error) {
        console.error('❌ Error saving support message:', error);
        // Fallback: broadcast without database save
        io.to(`support-${chatId}`).emit('newSupportMessage', { 
          chatId, 
          senderId: String(senderId), 
          text 
        });
      }
    });


  });
}

module.exports = {
  setupSocket,
  onlineUsers,
};
