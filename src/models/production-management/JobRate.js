const mongoose = require('mongoose');

// Admin-maintained lookup: for a given combination of printType, fabricType, dyerName, what is the job rate?
const jobRateSchema = new mongoose.Schema(
  {
    printType: { type: String, required: true, trim: true },
    fabricType: { type: String, required: true, trim: true },
    dyerName: { type: String, required: true, trim: true },
    rate: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

// Ensure uniqueness for a combination of printType, fabricType, dyerName
jobRateSchema.index(
  { printType: 1, fabricType: 1, dyerName: 1 },
  { unique: true }
);

module.exports = mongoose.model('JobRate', jobRateSchema);
