// const mongoose = require('mongoose');

// // One row's entered values. `cells` keys are column names — either the fixed
// // Label/Dispatch columns, or (for Return) that platform's configured carrier
// // columns. Kept as a loosely-typed map since columns vary by station/platform.
// const challanRowSchema = new mongoose.Schema(
//   {
//     rowLabel: { type: String, required: true, trim: true },
//     cells: { type: Map, of: Number, default: {} },
//     total: { type: Number, default: 0 }, // auto: sum of this row's cells
//   },
//   { _id: false }
// );

// const challanPlatformBlockSchema = new mongoose.Schema(
//   {
//     platformConfig: { type: mongoose.Schema.Types.ObjectId, ref: 'ChallanPlatformConfig', required: true },
//     platformName: { type: String, required: true, trim: true }, // snapshot
//     rowType: { type: String, enum: ['brand', 'carrier'], required: true }, // snapshot
//     columns: { type: [String], default: [] }, // snapshot of the fixed (label/dispatch) or carrier (return) columns
//     rows: { type: [challanRowSchema], default: [] },
//     total: { type: Number, default: 0 }, // auto: sum of all rows' totals for this platform block
//   },
//   { _id: false }
// );

// const challanEntrySchema = new mongoose.Schema(
//   {
//     station: { type: String, enum: ['label', 'dispatch', 'return'], required: true },
//     date: { type: Date, required: true }, // stored at UTC midnight for the calendar day

//     platforms: { type: [challanPlatformBlockSchema], default: [] },

//     // Return Station only: the hand-written "TOTAL RETURNS" figure at the
//     // bottom of the paper form (kept separate from the computed grandTotal).
//     totalReturns: { type: Number, required: false },

//     grandTotal: { type: Number, default: 0 }, // auto: sum of all platform blocks' totals

//     sign: { type: String, trim: true, required: false },
//     submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
//     submittedAt: { type: Date, required: false },
//   },
//   { timestamps: true }
// );

// // One form per station per calendar day.
// challanEntrySchema.index({ station: 1, date: 1 }, { unique: true });

// module.exports = mongoose.model('ChallanEntry', challanEntrySchema);


const mongoose = require('mongoose');

// One row's entered values. `cells` keys are column names — either the fixed
// Label/Dispatch columns, or (for Return) that platform's configured carrier
// columns. Stored as Mixed (plain object) rather than a Mongoose Map: Map
// keys can't contain periods (Mongoose reserves "." for nested-path
// notation), and the Label Station's "D. Total" column has one.
const challanRowSchema = new mongoose.Schema(
  {
    rowLabel: { type: String, required: true, trim: true },
    cells: { type: mongoose.Schema.Types.Mixed, default: {} },
    total: { type: Number, default: 0 }, // auto: sum of this row's cells
  },
  { _id: false }
);

const challanPlatformBlockSchema = new mongoose.Schema(
  {
    platformConfig: { type: mongoose.Schema.Types.ObjectId, ref: 'ChallanPlatformConfig', required: true },
    platformName: { type: String, required: true, trim: true }, // snapshot
    rowType: { type: String, enum: ['brand', 'carrier'], required: true }, // snapshot
    columns: { type: [String], default: [] }, // snapshot of the fixed (label/dispatch) or carrier (return) columns
    rows: { type: [challanRowSchema], default: [] },
    total: { type: Number, default: 0 }, // auto: sum of all rows' totals for this platform block
  },
  { _id: false }
);

const challanEntrySchema = new mongoose.Schema(
  {
    station: { type: String, enum: ['label', 'dispatch', 'return'], required: true },
    date: { type: Date, required: true }, // stored at UTC midnight for the calendar day

    platforms: { type: [challanPlatformBlockSchema], default: [] },

    // Return Station only: the hand-written "TOTAL RETURNS" figure at the
    // bottom of the paper form (kept separate from the computed grandTotal).
    totalReturns: { type: Number, required: false },

    grandTotal: { type: Number, default: 0 }, // auto: sum of all platform blocks' totals

    sign: { type: String, trim: true, required: false },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    submittedAt: { type: Date, required: false },
  },
  { timestamps: true }
);

// One form per station per calendar day.
challanEntrySchema.index({ station: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('ChallanEntry', challanEntrySchema);