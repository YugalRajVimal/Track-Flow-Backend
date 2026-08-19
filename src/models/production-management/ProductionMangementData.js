const mongoose = require('mongoose');

// Schema for Production Management Data dropdown and essential fields (all as arrays)

const productionManagementDataSchema = new mongoose.Schema(
  {
    // Implement a taskId counter via auto-increment
    taskIdCounter: {
      type: Number,
    },
    builtyIdCounter: {
      type: Number,
    },
    rawMaterialInCounter: {
      type: Number,
    },
    costManagementCounter: {
      type: Number,
    },
    fabricSupplier: [
      { type: String, trim: true, required: true }
    ],
    length: [
      { type: Number, required: true }
    ],
    fabricType: [
      { type: String, trim: true, required: true }
    ],
    fabricQuality: [
      { type: String, trim: true, required: true }
    ],
    dyerName: [
      { type: String, trim: true, required: true }
    ],
    sinkage: [
      { type: Number, required: true }
    ],
    styleName: [
      { type: String, trim: true, required: true }
    ],
    printType: [
      { type: String, trim: true, required: true }
    ],
    styleCutting: [
      { type: String, trim: true, required: true }
    ],
    cuttingMasterName: [
      { type: String, trim: true, required: true }
    ],
    fabricatorName: [
      { type: String, trim: true, required: true }
    ],
    receiverName: [
      { type: String, trim: true, required: true }
    ],

    // ── Added for Raw Materials In / Cost Management pages ────────────────
    supplierName: [
      { type: String, trim: true, required: true }
    ],
    items: [
      { type: String, trim: true, required: true }
    ],
    packingMaterial: [
      { type: String, trim: true, required: true }
    ],
    finishing: [
      { type: String, trim: true, required: true }
    ],

    // ── Added for Cost Management/Verification sign dropdown ──────────────
    signUser: [
      { type: String, trim: true, required: true }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('ProductionManagementData', productionManagementDataSchema);
