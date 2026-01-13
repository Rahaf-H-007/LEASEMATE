const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  landlord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  unit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    required: false
  },
  lastMessage: {
    type: String
  },
  lastMessageAt: {
    type: Date
  },
},
{ timestamps: true });

module.exports = mongoose.model('Chat', chatSchema); 