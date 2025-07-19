const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  leaseId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Lease",
    index: true,
  },
  reviewerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  revieweeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
  },
    sentiment: {
    type: String, // e.g. "positive", "negative", "neutral"
  },
  keywords: [{
    type: String
  }],
  abusive: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// ensure one review per lease + reviewer
reviewSchema.index({ leaseId: 1, reviewerId: 1 }, { unique: true });

module.exports = mongoose.model("Review", reviewSchema);
