const ChallanPlatformConfig = require('../../../models/production-management/challanManagement/ChallanPlatformConfig');

function cleanRows(arr) {
  return Array.isArray(arr) ? arr.map((s) => String(s).trim()).filter(Boolean) : [];
}

function buildStationBlock(input, { requireColumns = false } = {}) {
  if (!input || !input.rowType) throw new Error('rowType is required for each station block.');
  if (!['brand', 'carrier'].includes(input.rowType)) throw new Error("rowType must be 'brand' or 'carrier'.");
  const block = { rowType: input.rowType, rows: cleanRows(input.rows) };
  if (requireColumns) block.columns = cleanRows(input.columns);
  return block;
}

async function createPlatformConfig(data) {
  const { name, label, dispatch } = data;
  const ret = data.return;
  if (!name) throw new Error('name is required.');

  return ChallanPlatformConfig.create({
    name: String(name).trim(),
    active: data.active !== undefined ? !!data.active : true,
    order: data.order !== undefined ? Number(data.order) : 0,
    label: buildStationBlock(label),
    dispatch: buildStationBlock(dispatch),
    return: buildStationBlock(ret, { requireColumns: true }),
  });
}

async function updatePlatformConfig(id, data) {
  const update = {};
  if (data.name !== undefined) update.name = String(data.name).trim();
  if (data.active !== undefined) update.active = !!data.active;
  if (data.order !== undefined) update.order = Number(data.order);
  if (data.label !== undefined) update.label = buildStationBlock(data.label);
  if (data.dispatch !== undefined) update.dispatch = buildStationBlock(data.dispatch);
  if (data.return !== undefined) update.return = buildStationBlock(data.return, { requireColumns: true });

  return ChallanPlatformConfig.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
}

async function deletePlatformConfig(id) {
  return ChallanPlatformConfig.findByIdAndDelete(id);
}

async function fetchPlatformConfigs(filter = {}) {
  const query = {};
  if (filter.active !== undefined) query.active = filter.active === 'true' || filter.active === true;
  return ChallanPlatformConfig.find(query).sort({ order: 1, name: 1 });
}

async function fetchPlatformConfigById(id) {
  return ChallanPlatformConfig.findById(id);
}

module.exports = {
  createPlatformConfig,
  updatePlatformConfig,
  deletePlatformConfig,
  fetchPlatformConfigs,
  fetchPlatformConfigById,
};
