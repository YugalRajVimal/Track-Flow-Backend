const mongoose = require('mongoose');

// Schema for Challan Management Data including channel, brand, courier, signUsers (all as arrays)

const challanManagementDataSchema = new mongoose.Schema(
  {
    // Example: auto-increment or counters if needed, adjust as per project convention
    challanIdCounter: {
      type: Number,
    },
    // Dropdown/option arrays for Challan context
    channel: [
      { type: String, trim: true, required: true }
    ],
    brand: [
      { type: String, trim: true, required: true }
    ],
    courier: [
      { type: String, trim: true, required: true }
    ],
    signUsers: [
      { type: String, trim: true, required: true }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChallanManagementData', challanManagementDataSchema);
