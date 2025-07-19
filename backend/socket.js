const Notification = require("./models/notification.model");

const onlineUsers = {};

function setupSocket(io) {
  io.on('connection', (socket) => {
    console.log("✅ Socket connected:", socket.id);

    socket.on('join', async (userId) => {
      console.log("📌 User joined:", userId);
      onlineUsers[userId] = socket.id;

      // Fetch unread notifications from DB:
      const unread = await Notification.find({
        userId: userId,
        isRead: false,
      }).sort({ createdAt: -1 });

      // Send them via socket:
      unread.forEach((notif) => {
        socket.emit("newNotification", notif);
      });
    });

    socket.on('disconnect', () => {
      console.log("❌ Socket disconnected:", socket.id);
      for (let id in onlineUsers) {
        if (onlineUsers[id] === socket.id) {
          delete onlineUsers[id];
          break;
        }
      }
    });
  });
}

module.exports = {
  setupSocket,
  onlineUsers,
};
