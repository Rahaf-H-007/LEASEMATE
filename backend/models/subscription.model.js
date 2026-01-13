const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  planName: { type: String, enum: ['basic', 'standard', 'premium'], required: true },
  stripeSubscriptionId: { type: String, required: true },
  status: { type: String, enum: ['active', 'expired', 'cancelled', 'refunded'], default: 'active' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  unitLimit: { type: Number, required: true },
  refunded: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema); 