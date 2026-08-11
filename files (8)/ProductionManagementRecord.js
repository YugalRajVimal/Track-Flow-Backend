const mongoose = require('mongoose');

// ─── Size-wise pieces (S, M, L, XL, XXL, XXXL) ──────────────────────────────
// Reused for cutting actuals, fabricator assignments, due pieces, and receivings.
const sizeWiseSchema = new mongoose.Schema(
  {
    S: { type: Number, default: 0, min: 0 },
    M: { type: Number, default: 0, min: 0 },
    L: { type: Number, default: 0, min: 0 },
    XL: { type: Number, default: 0, min: 0 },
    XXL: { type: Number, default: 0, min: 0 },
    XXXL: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

// ─── Builty In → Verification sub-schema ────────────────────────────────────
// Filled by a second user who unlocks the "Verification Pending" record with
// their passcode (User.passcode).
const builtyVerificationSchema = new mongoose.Schema(
  {
    mtrShort: { type: Number, required: false },
    fabricQuality: { type: String, required: false, trim: true },
    remark: { type: String, required: false, trim: true },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    verifiedByName: { type: String, required: false, trim: true },
    verifiedAt: { type: Date, required: false },
  },
  { _id: false }
);

// ─── Ready Fabric → Completion sub-schema ───────────────────────────────────
// Filled by a second user who moves a "pending" record to done/returned.
const readyFabricCompletionSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ['done', 'returned'], required: false },
    jobRate: { type: Number, required: false },
    amount: { type: Number, required: false }, // jobRate * mtrAfterL100(=mtrL100 here, no sinkage stage)
    mtrShort: { type: Number, required: false }, // Added mtrShort field
    remark: { type: String, required: false, trim: true },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    completedByName: { type: String, required: false, trim: true },
    completedAt: { type: Date, required: false },
  },
  { _id: false }
);

// ─── Page 2: Cutting stage ───────────────────────────────────────────────────
// Applies only to Ready Fabric records whose readyFabricStatus === 'done'.
const cuttingSchema = new mongoose.Schema(
  {
    styleCutting: { type: String, required: false, trim: true },
    styleAverage: { type: Number, required: false }, // snapshot of StyleAverage.styleAverage at submit time
    expectedPieces: { type: Number, required: false }, // mtrL100 / styleAverage
    sizes: { type: sizeWiseSchema, default: () => ({}) }, // actual cutting input, size-wise
    totalPieces: { type: Number, required: false }, // sum of sizes
    actualAverage: { type: Number, required: false }, // mtrL100 / totalPieces
    fabricLoss: { type: Number, required: false }, // mtrL100 - (totalPieces * styleAverage)
    cuttingRegisterPhoto: { type: String, required: false, trim: true },
    cuttingMasterName: { type: String, required: false, trim: true },
    remark: { type: String, required: false, trim: true },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    submittedAt: { type: Date, required: false },
  },
  { _id: false }
);

// ─── Page 3: one receiving entry against ONE fabricator's assignment ───────
// A fabricator can submit received pieces back in parts, any number of times,
// until their own due reaches zero. `receivedSizes` is what came in on THIS
// entry; `dueAfterEntry` is a snapshot of what's still owed by this
// fabricator right after this entry (for history display).
const fabricatorReceivingSchema = new mongoose.Schema(
  {
    receivedSizes: { type: sizeWiseSchema, default: () => ({}) },
    totalReceivedPieces: { type: Number, required: true, min: 0 }, // sum of receivedSizes, auto
    ratePerPiece: { type: Number, required: true, min: 0 }, // snapshot of the assignment's rate at entry time
    totalAmount: { type: Number, required: true, min: 0 }, // totalReceivedPieces * ratePerPiece
    receivingEntryPhoto: { type: String, required: false, trim: true },
    receiverName: { type: String, required: false, trim: true },
    dueAfterEntry: { type: sizeWiseSchema, default: () => ({}) },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    receivedByName: { type: String, required: false, trim: true },
    receivedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ─── Page 3: ONE fabricator's assignment on this record ────────────────────
// A record can have MULTIPLE fabricator assignments (pieces split across
// fabricators). Each assignment is made once (size-wise, fixed at creation);
// what varies over time is how much of that assignment has been received
// back (tracked via `duePieces` + `receivings`).
const fabricatorAssignmentSchema = new mongoose.Schema(
  {
    fabricatorName: { type: String, required: true, trim: true },
    fabricatorReceiverChPhoto: { type: String, required: false, trim: true },
    styleCutting: { type: String, required: false, trim: true }, // snapshot, used for rate lookup
    assignedSizes: { type: sizeWiseSchema, required: true, default: () => ({}) }, // fixed at assignment time
    totalAssignedPieces: { type: Number, required: true, default: 0 }, // sum of assignedSizes, auto
    ratePerPiece: { type: Number, required: false, default: 0, min: 0 }, // from FabricatorRate lookup, snapshot
    duePieces: { type: sizeWiseSchema, default: () => ({}) }, // remaining unreceived, size-wise
    totalDuePieces: { type: Number, required: true, default: 0 }, // sum of duePieces, auto
    receivings: { type: [fabricatorReceivingSchema], default: [] },
    status: {
      type: String,
      enum: ['pending', 'partially-received', 'completed'],
      default: 'pending',
    },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    assignedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const productionManagementRecordSchema = new mongoose.Schema(
  {
    taskId: {
      type: String,
      required: [true, 'Task ID is required'],
      unique: true,
      trim: true,
    },
    taskType: {
      type: String,
      enum: ['BuiltyIn', 'ReadyFabric'],
      required: true,
    },

    // ─── Page 1 — Builty In ────────────────────────────────────────────────
    fabricSupplier: { type: String, trim: true, required: false },
    builtyNo: { type: String, trim: true, required: false },
    rolls: { type: Number, required: false },
    chNo: { type: String, trim: true, required: false }, // not mandatory
    length: { type: Number, required: false },
    fabricType: { type: String, trim: true, required: false },
    fabricQuality: { type: String, trim: true, required: false }, // Added field
    printType: { type: String, trim: true, required: false }, // <-- Added printType field
    mtr: { type: Number, required: false },
    mtrL100: { type: Number, required: false }, // mtr - (mtr * (100 - length) / 100)
    amount: { type: Number, required: false },
    supplierBillPhoto: { type: String, trim: true, required: false }, // not mandatory
    dyerName: { type: String, trim: true, required: false },
    sinkage: { type: Number, required: false },
    mtrAfterSinkage: { type: Number, required: false }, // mtrL100 - (mtrL100 * sinkage / 100)
    dyerReceiverChPhoto: { type: String, trim: true, required: false }, // not mandatory
    remark: { type: String, trim: true, required: false },

    // ADDED FIELD
    receiverName: { type: String, trim: true, required: false },

    verificationStatus: {
      type: String,
      enum: ['Verification Pending', 'Success'],
      default: undefined, // only set for BuiltyIn (see pre-validate below)
    },
    verification: { type: builtyVerificationSchema, required: false },

    // ─── Page 1 — Ready Fabric ─────────────────────────────────────────────
    styleName: { type: String, trim: true, required: false },
    totalThan: { type: Number, required: false },
    // dyerName, fabricType, length, mtr, mtrL100, amount, chNo/chPhoto (reuses supplierBillPhoto? no — see below), remark shared with Builty In fields above where names match.
    chPhoto: { type: String, trim: true, required: false }, // Ready Fabric "Ch. Photo Upload"

    readyFabricStatus: {
      type: String,
      enum: ['pending', 'done', 'returned'],
      default: undefined, // only set for ReadyFabric
    },
    completion: { type: readyFabricCompletionSchema, required: false },

    // ─── Page 2 — Cutting (Ready Fabric, status done, only) ─────────────────
    cutting: { type: cuttingSchema, required: false },

    // ─── Page 3 — Fabricator / Dispatch (can be split across multiple fabricators) ──
    fabricators: { type: [fabricatorAssignmentSchema], default: [] },

    date: { type: Date, required: false, default: null },
  },
  { timestamps: true }
);

// Set the correct default status field based on taskType, since Mongoose
// doesn't support conditional `default` across two different paths.
productionManagementRecordSchema.pre('validate', function (next) {
  if (this.taskType === 'BuiltyIn' && !this.verificationStatus) {
    this.verificationStatus = 'Verification Pending';
  }
  if (this.taskType === 'ReadyFabric' && !this.readyFabricStatus) {
    this.readyFabricStatus = 'pending';
  }
  next();
});

module.exports = mongoose.model('ProductionManagementRecord', productionManagementRecordSchema);
