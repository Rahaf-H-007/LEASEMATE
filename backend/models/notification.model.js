const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['PAYMENT_DUE', 'MAINTENANCE_UPDATE', 'LEASE_EXPIRY', 'GENERAL','VERIFICATION'],
    default: 'GENERAL'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  link: { // url 'frontend' path to be opened when the tentant clickes in the notification
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
