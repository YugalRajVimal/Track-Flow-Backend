const FabricatorRate = require('../../models/production-management/FabricatorRate');

async function createFabricatorRate(data) {
  const { styleName, styleCutting, fabricatorName, rate } = data;
  if (!styleName || !styleCutting || !fabricatorName || rate === undefined) {
    throw new Error('styleName, styleCutting, fabricatorName, and rate are all required.');
  }
  return FabricatorRate.create({
    styleName: String(styleName).trim(),
    styleCutting: String(styleCutting).trim(),
    fabricatorName: String(fabricatorName).trim(),
    rate: Number(rate),
  });
}

async function updateFabricatorRate(id, data) {
  const update = {};
  ['styleName', 'styleCutting', 'fabricatorName'].forEach((k) => {
    if (data[k] !== undefined) update[k] = String(data[k]).trim();
  });
  if (data.rate !== undefined) update.rate = Number(data.rate);

  return FabricatorRate.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
}

async function deleteFabricatorRate(id) {
  return FabricatorRate.findByIdAndDelete(id);
}

async function fetchFabricatorRates(filter = {}) {
  const { styleName, styleCutting, fabricatorName } = filter;
  const query = {};
  if (styleName) query.styleName = styleName;
  if (styleCutting) query.styleCutting = styleCutting;
  if (fabricatorName) query.fabricatorName = fabricatorName;
  return FabricatorRate.find(query).sort({ styleName: 1, styleCutting: 1, fabricatorName: 1 });
}

async function fetchFabricatorRateById(id) {
  return FabricatorRate.findById(id);
}

/** Lookup a fabricator rate for a specific combination of fields. */
async function lookupFabricatorRate({ styleName, styleCutting, fabricatorName }) {
  return FabricatorRate.findOne({ styleName, styleCutting, fabricatorName });
}

module.exports = {
  createFabricatorRate,
  updateFabricatorRate,
  deleteFabricatorRate,
  fetchFabricatorRates,
  fetchFabricatorRateById,
  lookupFabricatorRate,
};
