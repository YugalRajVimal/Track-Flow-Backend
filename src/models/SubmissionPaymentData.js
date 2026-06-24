const mongoose = require('mongoose');

/**
 * Schema to store costing of per meter fabric (rate) according to:
 * - Program Name (programName)
 * - Party Name (partyName)
 * - Fabric Type (fabricType)
 * 
 * Each document represents one (programName, partyName, fabricType) combination and a per-mtr rate.
 * Example: { programName: "X", partyName: "Y", fabricType: "Z", rate: 12 }
 */
const submissionPaymentDataSchema = new mongoose.Schema(
  {
    programName: {
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

// To ensure uniqueness for (programName, partyName, fabricType)
submissionPaymentDataSchema.index(
  { programName: 1, partyName: 1, fabricType: 1 },
  { unique: true }
);

module.exports = mongoose.model('SubmissionPaymentData', submissionPaymentDataSchema);