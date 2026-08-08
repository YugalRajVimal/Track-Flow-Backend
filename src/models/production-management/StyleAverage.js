const mongoose = require('mongoose');

// Admin-maintained lookup: for a given StyleName + StyleCutting + FabricType,
// how many MTR of fabric is used per piece ("Style Average").
const styleAverageSchema = new mongoose.Schema(
  {
    styleName: { type: String, required: true, trim: true },
    styleCutting: { type: String, required: true, trim: true },
    fabricType: { type: String, required: true, trim: true },
    styleAverage: { type: Number, required: true, min: 0 }, // mtr per piece
  },
  { timestamps: true }
);

// One average per unique combination.
styleAverageSchema.index(
  { styleName: 1, styleCutting: 1, fabricType: 1 },
  { unique: true }
);

module.exports = mongoose.model('StyleAverage', styleAverageSchema);
