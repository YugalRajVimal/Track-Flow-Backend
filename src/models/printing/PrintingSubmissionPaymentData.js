const mongoose = require('mongoose');

/**
 * Schema to store costing of per meter fabric (rate) according to:
 * - Process Name (processName)
 * - Receiver Party Name (receiverPartyName)
 * - Fabric Type (fabricType)
 * 
 * Each document represents one (processName, receiverPartyName, fabricType) combination and a per-mtr rate.
 * Example: { processName: "X", receiverPartyName: "Y", fabricType: "Z", rate: 12 }
 */
const printingSubmissionPaymentDataSchema = new mongoose.Schema(
  {
    processName: {
      type: String,
      required: true,
      trim: true,
    },
    receiverPartyName: {
      type: String,
      required: true,
      trim: true,
    },
    fabricType: {
      type: String,
      required: true,
      trim: true,
    },
    rate: {
      type: Number, // Cost per meter
      required: true,
    }
  },
  { timestamps: true }
);

// To ensure uniqueness for (processName, receiverPartyName, fabricType)
printingSubmissionPaymentDataSchema.index(
  { processName: 1, receiverPartyName: 1, fabricType: 1 },
  { unique: true }
);

module.exports = mongoose.model('PrintingSubmissionPaymentData', printingSubmissionPaymentDataSchema);