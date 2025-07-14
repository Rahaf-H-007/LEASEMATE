const mongoose = require('mongoose');

const leaseSchema = new mongoose.Schema({
  landlordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  unitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    required: false,
  },
  startDate: Date,
  endDate: Date,
  rentAmount: Number,
  status: {
    type: String,
    enum: ['active', 'terminated', 'pending'],
    default: 'active'
  }
});

module.exports = mongoose.model('Lease', leaseSchema);
