const mongoose = require("mongoose");

const bookingRequestSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  unitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Units",
    required: true
  },
  message: String,
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending"
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  leaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lease"
  }
});

module.exports = mongoose.model("BookingRequest", bookingRequestSchema);
