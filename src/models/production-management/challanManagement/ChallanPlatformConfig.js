const mongoose = require('mongoose');

// Label / Dispatch stations: fixed columns (Accept/Downloaded/D.Total or
// Packed/Dispatched/Pending/Cancelled), but the ROWS vary — some platforms
// are scanned brand-wise (Ammiy, K.R., Rajasthan, Siya), others carrier-wise
// (Delhivery, Shadowfax, ...). rowType is just a label for the UI; the
// actual list is whatever the admin types into `rows`.
const stationRowConfigSchema = new mongoose.Schema(
  {
    rowType: { type: String, enum: ['brand', 'carrier'], required: true },
    rows: { type: [String], default: [] },
  },
  { _id: false }
);

// Return station is a matrix: rows (brand, or a single row for a platform
// that isn't scanned per-brand, e.g. AL Website) × columns (that platform's
// carriers, which also vary — Meesho has 4, Flipkart/Myntra only use Ekart).
const returnStationConfigSchema = new mongoose.Schema(
  {
    rowType: { type: String, enum: ['brand', 'carrier'], required: true },
    rows: { type: [String], default: [] },
    columns: { type: [String], default: [] },
  },
  { _id: false }
);

const challanPlatformConfigSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true }, // 'Meesho', 'Flipkart', 'Myntra', 'AL Website', ...
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 }, // display order across all 3 station forms

    label: { type: stationRowConfigSchema, required: true },
    dispatch: { type: stationRowConfigSchema, required: true },
    return: { type: returnStationConfigSchema, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChallanPlatformConfig', challanPlatformConfigSchema);
