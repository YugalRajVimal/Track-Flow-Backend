const ChallanEntry = require('../../../models/production-management/challanManagement/ChallanEntry');
const ChallanPlatformConfig = require('../../../models/production-management/challanManagement/ChallanPlatformConfig');

const LABEL_COLUMNS = ['Accept', 'Downloaded', 'D. Total'];
const DISPATCH_COLUMNS = ['Packed', 'Dispatched', 'Pending', 'Cancelled'];

function startOfDay(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date.');
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function rowsConfigForStation(station, platformConfig) {
  if (station === 'label') return platformConfig.label;
  if (station === 'dispatch') return platformConfig.dispatch;
  if (station === 'return') return platformConfig.return;
  throw new Error("station must be 'label', 'dispatch', or 'return'.");
}

function columnsForStation(station, platformConfig) {
  if (station === 'label') return LABEL_COLUMNS;
  if (station === 'dispatch') return DISPATCH_COLUMNS;
  if (station === 'return') return platformConfig.return.columns || [];
  throw new Error("station must be 'label', 'dispatch', or 'return'.");
}

function sumCells(cells = {}) {
  return Object.values(cells).reduce((s, v) => s + (Number(v) || 0), 0);
}

/** Builds a blank platform block (no cell values yet) from a platform config, for a given station. */
function buildBlankPlatformBlock(station, platformConfig) {
  const rowsCfg = rowsConfigForStation(station, platformConfig);
  const columns = columnsForStation(station, platformConfig);
  return {
    platformConfig: platformConfig._id,
    platformName: platformConfig.name,
    rowType: rowsCfg.rowType,
    columns,
    rows: (rowsCfg.rows || []).map((rowLabel) => ({ rowLabel, cells: {}, total: 0 })),
    total: 0,
  };
}

/**
 * Fetches the saved entry for (station, date). If none exists yet, returns a
 * blank (unsaved) skeleton built from the currently active platform configs,
 * so the UI always has a form to render for a fresh day.
 */
async function fetchOrBuildEntry(station, dateStr) {
  const date = startOfDay(dateStr);
  const existing = await ChallanEntry.findOne({ station, date });
  if (existing) return { entry: existing, isNew: false };

  const configs = await ChallanPlatformConfig.find({ active: true }).sort({ order: 1, name: 1 });
  const platforms = configs.map((cfg) => buildBlankPlatformBlock(station, cfg));

  return {
    entry: { station, date, platforms, totalReturns: undefined, grandTotal: 0, sign: '' },
    isNew: true,
  };
}

/**
 * Saves (creates or updates) the entry for (station, date) with the given
 * platform rows' cell values. Row / platform / grand totals are always
 * recomputed server-side from the raw cells, never trusted from the client.
 */
async function saveEntry(station, dateStr, { platforms, totalReturns, sign, userId }) {
  const date = startOfDay(dateStr);
  if (!Array.isArray(platforms)) throw new Error('platforms is required.');

  const configs = await ChallanPlatformConfig.find({ active: true }).sort({ order: 1, name: 1 });
  const configById = new Map(configs.map((c) => [String(c._id), c]));

  let grandTotal = 0;
  const builtPlatforms = platforms.map((p) => {
    const cfg = configById.get(String(p.platformConfigId));
    if (!cfg) throw new Error(`Unknown or inactive platform in submission: ${p.platformName || p.platformConfigId}`);

    const rowsCfg = rowsConfigForStation(station, cfg);
    const columns = columnsForStation(station, cfg);
    const allowedRowLabels = new Set(rowsCfg.rows || []);
    const allowedColumns = new Set(columns);

    let platformTotal = 0;
    const builtRows = (p.rows || []).map((r) => {
      if (!allowedRowLabels.has(r.rowLabel)) {
        throw new Error(`Row "${r.rowLabel}" is not configured for ${cfg.name}.`);
      }
      const cleanCells = {};
      Object.entries(r.cells || {}).forEach(([k, v]) => {
        if (!allowedColumns.has(k)) return; // ignore stray/unconfigured columns
        cleanCells[k] = Number(v) || 0;
      });
      const rowTotal = sumCells(cleanCells);
      platformTotal += rowTotal;
      return { rowLabel: r.rowLabel, cells: cleanCells, total: rowTotal };
    });

    grandTotal += platformTotal;

    return {
      platformConfig: cfg._id,
      platformName: cfg.name,
      rowType: rowsCfg.rowType,
      columns,
      rows: builtRows,
      total: platformTotal,
    };
  });

  const update = {
    station,
    date,
    platforms: builtPlatforms,
    grandTotal,
    sign,
    submittedBy: userId || undefined,
    submittedAt: new Date(),
  };
  if (station === 'return' && totalReturns !== undefined && totalReturns !== '') {
    update.totalReturns = Number(totalReturns);
  }

  const saved = await ChallanEntry.findOneAndUpdate(
    { station, date },
    { $set: update },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  return saved;
}

module.exports = {
  fetchOrBuildEntry,
  saveEntry,
  LABEL_COLUMNS,
  DISPATCH_COLUMNS,
};
