const StyleAverage = require('../../models/production-management/StyleAverage');

async function createStyleAverage(data) {
  const { styleName, styleCutting, fabricType, styleAverage } = data;
  if (!styleName || !styleCutting || !fabricType || styleAverage === undefined) {
    throw new Error('styleName, styleCutting, fabricType and styleAverage are all required.');
  }
  return StyleAverage.create({
    styleName: String(styleName).trim(),
    styleCutting: String(styleCutting).trim(),
    fabricType: String(fabricType).trim(),
    styleAverage: Number(styleAverage),
  });
}

async function updateStyleAverage(id, data) {
  const update = {};
  ['styleName', 'styleCutting', 'fabricType'].forEach((k) => {
    if (data[k] !== undefined) update[k] = String(data[k]).trim();
  });
  if (data.styleAverage !== undefined) update.styleAverage = Number(data.styleAverage);

  return StyleAverage.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
}

async function deleteStyleAverage(id) {
  return StyleAverage.findByIdAndDelete(id);
}

async function fetchStyleAverages(filter = {}) {
  const { styleName, styleCutting, fabricType } = filter;
  const query = {};
  if (styleName) query.styleName = styleName;
  if (styleCutting) query.styleCutting = styleCutting;
  if (fabricType) query.fabricType = fabricType;
  return StyleAverage.find(query).sort({ styleName: 1, styleCutting: 1, fabricType: 1 });
}

async function fetchStyleAverageById(id) {
  return StyleAverage.findById(id);
}

/** Used by the record service too, but exposed here for a direct "lookup" API the frontend can hit while building the cutting form. */
async function lookupStyleAverage({ styleName, styleCutting, fabricType }) {
  return StyleAverage.findOne({ styleName, styleCutting, fabricType });
}

module.exports = {
  createStyleAverage,
  updateStyleAverage,
  deleteStyleAverage,
  fetchStyleAverages,
  fetchStyleAverageById,
  lookupStyleAverage,
};
