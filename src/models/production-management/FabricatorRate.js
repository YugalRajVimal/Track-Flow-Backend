const mongoose = require('mongoose');

// Admin-maintained lookup: for a given Style Name + Style Cutting + Fabricator,
// what is the rate paid per piece? Used to auto-fill/compute Amount when
// pieces are assigned to a fabricator on a Production Management Record.
const fabricatorRateSchema = new mongoose.Schema(
  {
    styleName: { type: String, required: true, trim: true },
    styleCutting: { type: String, required: true, trim: true },
    fabricatorName: { type: String, required: true, trim: true },
    rate: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

// Ensure uniqueness for a combination of styleName, styleCutting, fabricatorName
fabricatorRateSchema.index(
  { styleName: 1, styleCutting: 1, fabricatorName: 1 },
  { unique: true }
);

module.exports = mongoose.model('FabricatorRate', fabricatorRateSchema);
