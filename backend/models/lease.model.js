const mongoose = require("mongoose");

const leaseSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  landlordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  unitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Units",
    required: true
  },
  rentAmount: Number,
  depositAmount: Number,
  startDate: Date,
  endDate: Date,
  paymentTerms: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  leasePDF: String, // URL or file path to generated PDF
  status: {
    type: String,
    enum: ["active", "terminated", "pending", "expired", "rejected", ],
    default: "pending"
  },
  rejectionReason: {
    type: String,
    default: ""
  }
});

module.exports = mongoose.model("Lease", leaseSchema);
