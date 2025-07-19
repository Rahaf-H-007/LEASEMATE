const mongoose = require("mongoose");

const unitSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["villa", "apartment"],
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  images: {
    type: [String],
    //TODO: uncomment this when we're almost done
    // required: true
    // validate: [(arr) => arr.length > 0, "At least one image is required"],
  },

  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    // required: true
  },

  pricePerMonth: {
    type: Number,
    // required: true,
  },

  securityDeposit: {
    type: Number,
    // required: true,
  },

  numRooms: {
    type: Number,
    // required: true,
  },
  space: {
    type: Number,
    // required: true,
  },
  isFurnished: {
    type: Boolean,
    // required: true,
  },

  address: {
    type: String,
    // required: true,
  },
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [31.2357, 30.0444], // Default to Cairo coordinates
    },
  },
  city: {
    type: String,
    // required: true,
  },
  governorate: {
    type: String,
    // required: true,
  },
  postalCode: {
    type: Number,
  },

  hasPool: {
    type: Boolean,
    // required: function () {
    //   return this.type === "villa";
    // },
    default: false,
  },
  hasAC: {
    type: Boolean,
    // required: true,
    default: false,
  },
  hasTV: {
    type: Boolean,
    // required: true,
    default: false,
  },
  hasWifi: {
    type: Boolean,
    // required: true,
    default: false,
  },
  hasKitchenware: {
    type: Boolean,
    // required: true,
    default: false,
  },
  hasHeating: {
    type: Boolean,
    // required: true,
    default: false,
  },

  status: {
    type: String,
    enum: ["available", "booked", "under maintenance"],
    default: "available",
  },
});

// geospatial index for location-based queries
unitSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Units", unitSchema);
