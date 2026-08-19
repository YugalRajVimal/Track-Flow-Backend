const mongoose = require('mongoose');

// A repeatable cost line, e.g. finishing: [{label:'Dhaga', amount:5}, {label:'Button', amount:3}]
const costLineSchema = new mongoose.Schema(
  { label: { type: String, required: true, trim: true }, amount: { type: Number, required: true, min: 0 } },
  { _id: false }
);

const costManagementSchema = new mongoose.Schema(
  {
    recordId: {
      type: String,
      required: [true, 'Record ID is required'],
      unique: true,
      trim: true,
    },
    styleName: { type: String, required: true, trim: true },
    fabricType: { type: String, required: true, trim: true },
    printType: { type: String, required: true, trim: true },
    readyFabricRate: { type: Number, required: true, min: 0 },

    // Auto-populated from the StyleAverage lookup (styleName + fabricType) at
    // save time — a snapshot, not a live reference, so past records don't
    // shift if the admin edits the Style Average lookup later.
    styleAverage: { type: Number, required: false },

    cutting: { type: Number, required: false, min: 0, default: 0 },
    stitching: { type: Number, required: false, min: 0, default: 0 },
    finishing: { type: [costLineSchema], default: [] }, // e.g. Dhaga, Button, Press
    packingMaterial: { type: [costLineSchema], default: [] },
    other: { type: [costLineSchema], default: [] }, // e.g. Embroidery, Lace

    remark: { type: String, required: false, trim: true },

    // Computed: cutting + stitching + sum(finishing) + sum(packingMaterial) + sum(other) + readyFabricRate
    finalCosting: { type: Number, required: false },

    // Indicates whether this cost entry is verified/approved (passcode + sign gated)
    verified: { type: Boolean, required: false, default: false },

    // Name string for sign-off/approval (same signUser dropdown as Challan)
    sign: { type: String, required: false, trim: true },

    // Timestamp of when verification happened (set only on successful verify)
    verifiedAt: { type: Date, required: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CostManagement', costManagementSchema);