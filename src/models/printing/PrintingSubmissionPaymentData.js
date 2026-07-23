const mongoose = require('mongoose');

/**
 * Schema to store costing of per meter fabric (rate) according to:
 * - Print Type (printType)
 * - Party Name (partyName)
 * - Fabric Type (fabricType)
 * 
 * Each document represents one (printType, partyName, fabricType) combination and a per-mtr rate.
 * Example: { printType: "X", partyName: "Y", fabricType: "Z", rate: 12 }
 */
const printingSubmissionPaymentDataSchema = new mongoose.Schema(
  {
    printType: {
      type: String,
      required: true,
      trim: true,
    },
    partyName: {
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

// To ensure uniqueness for (printType, partyName, fabricType)
printingSubmissionPaymentDataSchema.index(
  { printType: 1, partyName: 1, fabricType: 1 },
  { unique: true }
);

module.exports = mongoose.model('PrintingSubmissionPaymentData', printingSubmissionPaymentDataSchema);