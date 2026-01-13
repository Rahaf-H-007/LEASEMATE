const mongoose = require('mongoose');

const maintenanceRequestSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  unitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit', 
    required: false
  },
  contractId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contract',
    required: false
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  image: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'in progress', 'resolved'],
    default: 'pending'
  },
  notes: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('MaintenanceRequest', maintenanceRequestSchema); 