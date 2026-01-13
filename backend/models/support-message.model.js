const mongoose = require('mongoose');

const supportMessageSchema = new mongoose.Schema({
  supportChat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SupportChat',
    required: [true, 'Support chat ID is required'],
    index: true // Add index for better query performance
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender ID is required']
  },
  text: {
    type: String,
    required: [true, 'Message text is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  read: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Add compound index for better query performance
supportMessageSchema.index({ supportChat: 1, createdAt: 1 });

module.exports = mongoose.model('SupportMessage', supportMessageSchema); 