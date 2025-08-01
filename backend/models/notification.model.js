const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  leaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lease',
  },
  maintenanceRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MaintenanceRequest',
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  landlordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: [ 'LEASE_EXPIRED', 'GENERAL', 'MAINTENANCE_REQUEST', 'MAINTENANCE_UPDATE', 'LEASE_APPROVED', 'BOOKING_REQUEST', 'BOOKING_APPROVED', 'BOOKING_REJECTED', 'ABUSIVE_COMMENT_WARNING', 'UNIT_REJECTED','REFUND_ELIGIBLE','PAYMENT_SUCCESS', 'REFUND_SUCCESS','SUPPORT_MESSAGE_TO_ADMIN', 'SUPPORT_MESSAGE_TO_USER', 'USER_BLOCKED'],
    default: 'GENERAL',
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  link: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
});

module.exports = mongoose.model('Notification', notificationSchema);
