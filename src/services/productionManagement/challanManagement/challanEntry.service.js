
// const ChallanEntry = require('../../../models/production-management/challanManagement/ChallanEntry');
// const ChallanPlatformConfig = require('../../../models/production-management/challanManagement/ChallanPlatformConfig');
// const User = require('../../../models/User');
// const { verifyVerificationPasscode } = require('../../../services/user.service');
 
// const LABEL_COLUMNS = ['Accept', 'Downloaded'];
// const DISPATCH_COLUMNS = ['Packed', 'Dispatched', 'Pending', 'Cancelled'];
 
// function startOfDay(dateStr) {
//   const d = new Date(dateStr);
//   if (Number.isNaN(d.getTime())) throw new Error('Invalid date.');
//   d.setUTCHours(0, 0, 0, 0);
//   return d;
// }
 
// function rowsConfigForStation(station, platformConfig) {
//   if (station === 'label') return platformConfig.label;
//   if (station === 'dispatch') return platformConfig.dispatch;
//   if (station === 'return') return platformConfig.return;
//   throw new Error("station must be 'label', 'dispatch', or 'return'.");
// }
 
// function columnsForStation(station, platformConfig) {
//   if (station === 'label') return LABEL_COLUMNS;
//   if (station === 'dispatch') return DISPATCH_COLUMNS;
//   if (station === 'return') return platformConfig.return.columns || [];
//   throw new Error("station must be 'label', 'dispatch', or 'return'.");
// }
 
// function sumCells(cells = {}) {
//   return Object.values(cells).reduce((s, v) => s + (Number(v) || 0), 0);
// }
 
// /** Builds a blank platform block (no cell values yet) from a platform config, for a given station. */
// function buildBlankPlatformBlock(station, platformConfig) {
//   const rowsCfg = rowsConfigForStation(station, platformConfig);
//   const columns = columnsForStation(station, platformConfig);
//   return {
//     platformConfig: platformConfig._id,
//     platformName: platformConfig.name,
//     rowType: rowsCfg.rowType,
//     columns,
//     rows: (rowsCfg.rows || []).map((rowLabel) => ({ rowLabel, cells: {}, total: 0 })),
//     total: 0,
//   };
// }
 
// /**
//  * Fetches the saved entry for (station, date). If none exists yet, returns a
//  * blank (unsaved) skeleton built from the currently active platform configs,
//  * so the UI always has a form to render for a fresh day.
//  *
//  * Added fields: channel, brand, courier, remark, missingOrderOrReturnCount (default to null/empty as appropriate)
//  * Label Station additionally carries: remark, challanPhotoUrl (saved directly, no verification step).
//  */
// async function fetchOrBuildEntry(station, dateStr) {
//   const date = startOfDay(dateStr);
//   const existing = await ChallanEntry.findOne({ station, date });
//   if (existing) return { entry: existing, isNew: false };
 
//   const configs = await ChallanPlatformConfig.find({ active: true }).sort({ order: 1, name: 1 });
//   const platforms = configs.map((cfg) => buildBlankPlatformBlock(station, cfg));
 
//   return {
//     entry: {
//       station,
//       date,
//       platforms,
//       totalReturns: undefined,
//       grandTotal: 0,
//       // Removing: sign, channel, brand, courier, missingOrderOrReturnCount
//       // as their management will be handled in verification step (dispatch/return)
//       remark: '',
//       challanPhotoUrl: '',
//       verified: false,
//     },
//     isNew: true,
//   };
// }
 
// /**
//  * Saves (creates or updates) the entry for (station, date) with the given
//  * platform rows' cell values. Row / platform / grand totals are always
//  * recomputed server-side from the raw cells, never trusted from the client.
//  *
//  * Does NOT accept: channel, brand, courier, missingOrderOrReturnCount, sign (now managed in verification)
//  * DOES accept: remark, challanPhotoUrl — used by Label Station, saved directly here since Label
//  * has no verification step.
//  */
// async function saveEntry(
//   station,
//   dateStr,
//   {
//     platforms,
//     totalReturns,
//     remark,
//     challanPhotoUrl,
//     userId,
//     challanSign, // Added challanSign
//     // Removed: sign, channel, brand, courier, missingOrderOrReturnCount
//   }
// ) {
//   const date = startOfDay(dateStr);
//   if (!Array.isArray(platforms)) throw new Error('platforms is required.');
 
//   const configs = await ChallanPlatformConfig.find({ active: true }).sort({ order: 1, name: 1 });
//   const configById = new Map(configs.map((c) => [String(c._id), c]));
 
//   let grandTotal = 0;
//   const builtPlatforms = platforms.map((p) => {
//     const cfg = configById.get(String(p.platformConfigId));
//     if (!cfg) throw new Error(`Unknown or inactive platform in submission: ${p.platformName || p.platformConfigId}`);
 
//     const rowsCfg = rowsConfigForStation(station, cfg);
//     const columns = columnsForStation(station, cfg);
//     const allowedRowLabels = new Set(rowsCfg.rows || []);
//     const allowedColumns = new Set(columns);
 
//     let platformTotal = 0;
//     const builtRows = (p.rows || []).map((r) => {
//       if (!allowedRowLabels.has(r.rowLabel)) {
//         throw new Error(`Row "${r.rowLabel}" is not configured for ${cfg.name}.`);
//       }
//       const cleanCells = {};
//       Object.entries(r.cells || {}).forEach(([k, v]) => {
//         if (!allowedColumns.has(k)) return; // ignore stray/unconfigured columns
//         cleanCells[k] = Number(v) || 0;
//       });
//       const rowTotal = sumCells(cleanCells);
//       platformTotal += rowTotal;
//       return { rowLabel: r.rowLabel, cells: cleanCells, total: rowTotal };
//     });
 
//     grandTotal += platformTotal;
 
//     return {
//       platformConfig: cfg._id,
//       platformName: cfg.name,
//       rowType: rowsCfg.rowType,
//       columns,
//       rows: builtRows,
//       total: platformTotal,
//     };
//   });
 
//   const update = {
//     station,
//     date,
//     platforms: builtPlatforms,
//     grandTotal,
//     submittedBy: userId || undefined,
//     submittedAt: new Date(),
//     verified: false, // By default, manual verification step is needed for "dispatch" and "return"
//   };
//   if (station === 'return' && totalReturns !== undefined && totalReturns !== '') {
//     update.totalReturns = Number(totalReturns);
//   }
 
//   // Label Station: remark + photo saved directly (no verification step for label).
//   // Only set when provided so re-saving without touching these fields doesn't blank them out.
//   if (typeof remark === 'string') {
//     update.remark = remark;
//   }
//   if (typeof challanPhotoUrl === 'string' && challanPhotoUrl) {
//     update.challanPhotoUrl = challanPhotoUrl;
//   }
//   // Add challanSign if provided
//   if (typeof challanSign === 'string' && challanSign) {
//     update.challanSign = challanSign;
//   }
 
//   const saved = await ChallanEntry.findOneAndUpdate(
//     { station, date },
//     { $set: update },
//     { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
//   );
//   return saved;
// }
 
// /**
//  * Verifies the verification passcode for a user and, if successful, marks the
//  * dispatch or return entry as "verified" and updates verification fields.
//  *
//  * Allowed only for "dispatch" or "return".
//  *
//  * Accepts: verificationPasscode, user (object or userId), station, dateStr,
//  * as well as verification fields: channel, brand, courier, remark, missingOrderOrReturnCount, sign.
//  *
//  * On success marks the entry as verified and updates those fields.
//  */
// async function verifyDispatchOrReturnEntry({
//   station,
//   dateStr,
//   user, // May be user object or userId
//   verificationPasscode,
//   channel,
//   brand,
//   courier,
//   remark,
//   missingOrderOrReturnCount,
//   sign
// }) {
//   console.log('[verifyDispatchOrReturnEntry] called with:', { station, dateStr, user, verificationPasscode, channel, brand, courier, remark, missingOrderOrReturnCount, sign });
 
//   if (!['dispatch', 'return'].includes(station)) {
//     console.log('[verifyDispatchOrReturnEntry] Invalid station:', station);
//     throw new Error('Verification only applicable for dispatch or return.');
//   }
//   if (!verificationPasscode) {
//     console.log('[verifyDispatchOrReturnEntry] Missing verificationPasscode');
//     throw new Error('verificationPasscode is required.');
//   }
 
//   // Find and check user (can be id or user object)
//   let userObj = user;
//   if (typeof user === 'string') {
//     userObj = await User.findById(user);
//     if (!userObj) {
//       console.log('[verifyDispatchOrReturnEntry] User not found for id:', user);
//       throw new Error('User not found for verification.');
//     }
//   }
//   // Throws if not valid
//   try {
//     await verifyVerificationPasscode(userObj, verificationPasscode);
//   } catch (e) {
//     console.log('[verifyDispatchOrReturnEntry] Passcode verification failed:', e.message);
//     throw e;
//   }
 
//   // Locate the entry
//   const date = startOfDay(dateStr);
//   const entry = await ChallanEntry.findOne({ station, date });
//   if (!entry) {
//     console.log('[verifyDispatchOrReturnEntry] Entry not found for', { station, date });
//     throw new Error('Entry not found for verification.');
//   }
 
//   // Perform update (mark verified and update allowed fields)
//   entry.verified = true;
//   if (typeof channel === 'string') entry.channel = channel;
//   if (typeof brand === 'string') entry.brand = brand;
//   if (typeof courier === 'string') entry.courier = courier;
//   if (typeof remark === 'string') entry.remark = remark;
//   if (sign) entry.sign = sign;
//   if (missingOrderOrReturnCount !== undefined) {
//     entry.missingOrderOrReturnCount = Number(missingOrderOrReturnCount);
//   }
//   // Optionally, store who verified and when
//   entry.verifiedBy = userObj._id;
//   entry.verifiedAt = new Date();
 
//   console.log('[verifyDispatchOrReturnEntry] Marking entry as verified. Update:', {
//     verifiedBy: userObj._id,
//     verifiedAt: entry.verifiedAt,
//     channel: entry.channel,
//     brand: entry.brand,
//     courier: entry.courier,
//     remark: entry.remark,
//     sign: entry.sign,
//     missingOrderOrReturnCount: entry.missingOrderOrReturnCount
//   });
 
//   await entry.save();
//   console.log('[verifyDispatchOrReturnEntry] Entry saved and verified:', entry._id);
//   return entry;
// }
 
// // ─────────────────────────────────────────────────────────────────────────
// // Pending Verifications — Dispatch/Return entries not yet verified
// // ─────────────────────────────────────────────────────────────────────────
 
// /**
//  * Label Station has no verification step (see saveEntry), so only
//  * Dispatch/Return entries can ever be "pending verification". An entry only
//  * exists in the DB once it's been saved at least once (fetchOrBuildEntry
//  * returns an unsaved virtual doc otherwise), so `verified: false` here means
//  * "submitted but not yet verified" — exactly what a second-person review
//  * queue needs.
//  */
// async function fetchPendingVerifications() {
//   const entries = await ChallanEntry.find({
//     station: { $in: ['dispatch', 'return'] },
//     verified: false,
//   }).sort({ date: -1 });
 
//   return entries.map((e) => ({
//     station: e.station,
//     date: e.date,
//     dateStr: e.date.toISOString().slice(0, 10),
//     grandTotal: e.grandTotal,
//     totalReturns: e.totalReturns,
//     submittedAt: e.submittedAt,
//     platformCount: (e.platforms || []).length,
//   }));
// }
 
// // ─────────────────────────────────────────────────────────────────────────
// // Dashboard stats — grand totals across stations/platforms, filterable
// // ─────────────────────────────────────────────────────────────────────────
 
// /**
//  * Aggregates Challan Management figures for the common dashboard.
//  * Filters: station ('label'|'dispatch'|'return'), platformName, dateFrom,
//  * dateTo (both inclusive, matched against the entry's calendar `date`).
//  * All sums are computed in JS (mirrors the rest of this codebase's style)
//  * since the dataset per query window is small (at most one entry per
//  * station per day).
//  */
// // ─────────────────────────────────────────────────────────────────────────
// // Dashboard stats — grand totals across stations/platforms, filterable
// // ─────────────────────────────────────────────────────────────────────────

// // Column-name aliases we sum against. Cell keys are whatever the admin
// // typed into ChallanPlatformConfig (label/dispatch fixed columns), so we
// // match case-insensitively and allow a couple of common spellings.
// const COLUMN_ALIASES = {
//   downloaded: ['downloaded'],
//   packed: ['packed'],
//   dispatched: ['dispatched'],
//   cancelled: ['cancelled', 'cancel', 'canceled'],
//   pending: ['pending'],
// };

// function normalizeKey(k) {
//   return String(k || '').toLowerCase().trim();
// }

// /**
//  * Sums row.cells values whose column name matches one of `columnNames`,
//  * restricted to a given station and (optionally) verified/unverified only.
//  */
// function sumCellsByColumn(entries, { station, columnNames, onlyVerified } = {}) {
//   const wanted = new Set(columnNames.map(normalizeKey));
//   let sum = 0;

//   entries.forEach((e) => {
//     if (station && e.station !== station) return;
//     if (onlyVerified !== undefined && Boolean(e.verified) !== onlyVerified) return;

//     (e.platforms || []).forEach((p) => {
//       (p.rows || []).forEach((r) => {
//         Object.entries(r.cells || {}).forEach(([k, v]) => {
//           if (wanted.has(normalizeKey(k))) {
//             sum += Number(v) || 0;
//           }
//         });
//       });
//     });
//   });

//   return sum;
// }

// /**
//  * Aggregates Challan Management figures for the common dashboard.
//  * Filters: station ('label'|'dispatch'|'return'), platformName, dateFrom,
//  * dateTo (both inclusive, matched against the entry's calendar `date`).
//  * All sums are computed in JS (mirrors the rest of this codebase's style)
//  * since the dataset per query window is small (at most one entry per
//  * station per day).
//  */
// async function fetchChallanDashboardStats(filters = {}) {
//   const { station, platformName, dateFrom, dateTo } = filters;

//   const query = {};
//   if (station) query.station = station;
//   if (dateFrom || dateTo) {
//     query.date = {};
//     if (dateFrom) query.date.$gte = startOfDay(dateFrom);
//     if (dateTo) query.date.$lte = startOfDay(dateTo);
//   }

//   const entries = await ChallanEntry.find(query).sort({ date: -1 });

//   const byStation = { label: { total: 0, entries: 0 }, dispatch: { total: 0, entries: 0 }, return: { total: 0, entries: 0 } };
//   const byPlatform = {}; // platformName -> { total, byStation: {label,dispatch,return} }
//   let verifiedCount = 0;
//   let pendingVerificationCount = 0;
//   let totalReturnsFigure = 0; // hand-entered "TOTAL RETURNS" figure from Return station forms

//   entries.forEach((e) => {
//     byStation[e.station].total += e.grandTotal || 0;
//     byStation[e.station].entries += 1;
//     if (e.station !== 'label') {
//       if (e.verified) verifiedCount += 1;
//       else pendingVerificationCount += 1;
//     }
//     if (e.station === 'return' && typeof e.totalReturns === 'number') {
//       totalReturnsFigure += e.totalReturns;
//     }

//     (e.platforms || []).forEach((p) => {
//       if (platformName && p.platformName !== platformName) return;
//       if (!byPlatform[p.platformName]) {
//         byPlatform[p.platformName] = { platformName: p.platformName, total: 0, label: 0, dispatch: 0, return: 0 };
//       }
//       byPlatform[p.platformName].total += p.total || 0;
//       byPlatform[p.platformName][e.station] += p.total || 0;
//     });
//   });

//   // ── Dashboard summary cards (column-wise, across all platforms) ────────
//   const columnStats = {
//     totalDownloaded: sumCellsByColumn(entries, { station: 'label', columnNames: COLUMN_ALIASES.downloaded }),
//     totalPacked: sumCellsByColumn(entries, { station: 'dispatch', columnNames: COLUMN_ALIASES.packed }),
//     totalDispatched: sumCellsByColumn(entries, { station: 'dispatch', columnNames: COLUMN_ALIASES.dispatched }),
//     totalCancel: sumCellsByColumn(entries, { station: 'dispatch', columnNames: COLUMN_ALIASES.cancelled }),
//     totalPending: sumCellsByColumn(entries, { station: 'dispatch', columnNames: COLUMN_ALIASES.pending }),
//     // Return station is a carrier matrix (no single "Returns" column name),
//     // so "Total Returns" is the grand total of all Return-station rows.
//     totalReturns: byStation.return.total,
//     afterVerificationTotalDispatched: sumCellsByColumn(entries, {
//       station: 'dispatch',
//       columnNames: COLUMN_ALIASES.dispatched,
//       onlyVerified: true,
//     }),
//     afterVerificationTotalReturns: entries
//       .filter((e) => e.station === 'return' && e.verified)
//       .reduce((sum, e) => sum + (e.grandTotal || 0), 0),
//   };

//   return {
//     byStation,
//     byPlatform: Object.values(byPlatform).sort((a, b) => b.total - a.total),
//     verifiedCount,
//     pendingVerificationCount,
//     totalReturnsFigure,
//     columnStats,
//     entryCount: entries.length,
//   };
// }



// module.exports = {
//   fetchOrBuildEntry,
//   saveEntry,
//   verifyDispatchOrReturnEntry,
//   fetchPendingVerifications,
//   fetchChallanDashboardStats,
//   sumCellsByColumn,
//   LABEL_COLUMNS,
//   DISPATCH_COLUMNS,
// };













































const ChallanEntry = require('../../../models/production-management/challanManagement/ChallanEntry');
const ChallanPlatformConfig = require('../../../models/production-management/challanManagement/ChallanPlatformConfig');
const User = require('../../../models/User');
const { verifyVerificationPasscode } = require('../../../services/user.service');
 
const LABEL_COLUMNS = ['Accept', 'Downloaded'];
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
 *
 * Added fields: channel, brand, courier, remark, missingOrderOrReturnCount (default to null/empty as appropriate)
 * Label Station additionally carries: remark, challanPhotoUrl (saved directly, no verification step).
 */
async function fetchOrBuildEntry(station, dateStr) {
  const date = startOfDay(dateStr);
  const existing = await ChallanEntry.findOne({ station, date });
  if (existing) return { entry: existing, isNew: false };
 
  const configs = await ChallanPlatformConfig.find({ active: true }).sort({ order: 1, name: 1 });
  const platforms = configs.map((cfg) => buildBlankPlatformBlock(station, cfg));
 
  return {
    entry: {
      station,
      date,
      platforms,
      totalReturns: undefined,
      grandTotal: 0,
      // Removing: sign, channel, brand, courier, missingOrderOrReturnCount
      // as their management will be handled in verification step (dispatch/return)
      remark: '',
      challanPhotoUrl: '',
      verified: false,
    },
    isNew: true,
  };
}
 
/**
 * Saves (creates or updates) the entry for (station, date) with the given
 * platform rows' cell values. Row / platform / grand totals are always
 * recomputed server-side from the raw cells, never trusted from the client.
 *
 * Does NOT accept: channel, brand, courier, missingOrderOrReturnCount, sign (now managed in verification)
 * DOES accept: remark, challanPhotoUrl — used by Label Station, saved directly here since Label
 * has no verification step.
 */
async function saveEntry(
  station,
  dateStr,
  {
    platforms,
    totalReturns,
    remark,
    challanPhotoUrl,
    userId,
    challanSign, // Added challanSign
    // Removed: sign, channel, brand, courier, missingOrderOrReturnCount
  }
) {
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
    submittedBy: userId || undefined,
    submittedAt: new Date(),
    verified: false, // By default, manual verification step is needed for "dispatch" and "return"
  };
  if (station === 'return' && totalReturns !== undefined && totalReturns !== '') {
    update.totalReturns = Number(totalReturns);
  }
 
  // Label Station: remark + photo saved directly (no verification step for label).
  // Only set when provided so re-saving without touching these fields doesn't blank them out.
  if (typeof remark === 'string') {
    update.remark = remark;
  }
  if (typeof challanPhotoUrl === 'string' && challanPhotoUrl) {
    update.challanPhotoUrl = challanPhotoUrl;
  }
  // Add challanSign if provided
  if (typeof challanSign === 'string' && challanSign) {
    update.challanSign = challanSign;
  }
 
  const saved = await ChallanEntry.findOneAndUpdate(
    { station, date },
    { $set: update },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  return saved;
}
 
/**
 * Verifies the verification passcode for a user and, if successful, marks the
 * dispatch or return entry as "verified" and updates verification fields.
 *
 * Allowed only for "dispatch" or "return".
 *
 * Accepts: verificationPasscode, user (object or userId), station, dateStr,
 * as well as verification fields: channel, brand, courier, remark, missingOrderOrReturnCount, sign.
 *
 * On success marks the entry as verified and updates those fields.
 */
async function verifyDispatchOrReturnEntry({
  station,
  dateStr,
  user, // May be user object or userId
  verificationPasscode,
  channel,
  brand,
  courier,
  remark,
  missingOrderOrReturnCount,
  sign
}) {
  console.log('[verifyDispatchOrReturnEntry] called with:', { station, dateStr, user, verificationPasscode, channel, brand, courier, remark, missingOrderOrReturnCount, sign });
 
  if (!['dispatch', 'return'].includes(station)) {
    console.log('[verifyDispatchOrReturnEntry] Invalid station:', station);
    throw new Error('Verification only applicable for dispatch or return.');
  }
  if (!verificationPasscode) {
    console.log('[verifyDispatchOrReturnEntry] Missing verificationPasscode');
    throw new Error('verificationPasscode is required.');
  }
 
  // Find and check user (can be id or user object)
  let userObj = user;
  if (typeof user === 'string') {
    userObj = await User.findById(user);
    if (!userObj) {
      console.log('[verifyDispatchOrReturnEntry] User not found for id:', user);
      throw new Error('User not found for verification.');
    }
  }
  // Throws if not valid
  try {
    await verifyVerificationPasscode(userObj, verificationPasscode);
  } catch (e) {
    console.log('[verifyDispatchOrReturnEntry] Passcode verification failed:', e.message);
    throw e;
  }
 
  // Locate the entry
  const date = startOfDay(dateStr);
  const entry = await ChallanEntry.findOne({ station, date });
  if (!entry) {
    console.log('[verifyDispatchOrReturnEntry] Entry not found for', { station, date });
    throw new Error('Entry not found for verification.');
  }
 
  // Perform update (mark verified and update allowed fields)
  entry.verified = true;
  if (typeof channel === 'string') entry.channel = channel;
  if (typeof brand === 'string') entry.brand = brand;
  if (typeof courier === 'string') entry.courier = courier;
  if (typeof remark === 'string') entry.remark = remark;
  if (sign) entry.sign = sign;
  if (missingOrderOrReturnCount !== undefined) {
    entry.missingOrderOrReturnCount = Number(missingOrderOrReturnCount);
  }
  // Optionally, store who verified and when
  entry.verifiedBy = userObj._id;
  entry.verifiedAt = new Date();
 
  console.log('[verifyDispatchOrReturnEntry] Marking entry as verified. Update:', {
    verifiedBy: userObj._id,
    verifiedAt: entry.verifiedAt,
    channel: entry.channel,
    brand: entry.brand,
    courier: entry.courier,
    remark: entry.remark,
    sign: entry.sign,
    missingOrderOrReturnCount: entry.missingOrderOrReturnCount
  });
 
  await entry.save();
  console.log('[verifyDispatchOrReturnEntry] Entry saved and verified:', entry._id);
  return entry;
}
 
// ─────────────────────────────────────────────────────────────────────────
// Pending Verifications — Dispatch/Return entries not yet verified
// ─────────────────────────────────────────────────────────────────────────
 
/**
 * Label Station has no verification step (see saveEntry), so only
 * Dispatch/Return entries can ever be "pending verification". An entry only
 * exists in the DB once it's been saved at least once (fetchOrBuildEntry
 * returns an unsaved virtual doc otherwise), so `verified: false` here means
 * "submitted but not yet verified" — exactly what a second-person review
 * queue needs.
 */
async function fetchPendingVerifications() {
  const entries = await ChallanEntry.find({
    station: { $in: ['dispatch', 'return'] },
    verified: false,
  }).sort({ date: -1 });
 
  return entries.map((e) => ({
    station: e.station,
    date: e.date,
    dateStr: e.date.toISOString().slice(0, 10),
    grandTotal: e.grandTotal,
    totalReturns: e.totalReturns,
    submittedAt: e.submittedAt,
    platformCount: (e.platforms || []).length,
  }));
}
 
// ─────────────────────────────────────────────────────────────────────────
// Dashboard stats — grand totals across stations/platforms, filterable
// ─────────────────────────────────────────────────────────────────────────
 
/**
 * Aggregates Challan Management figures for the common dashboard.
 * Filters: station ('label'|'dispatch'|'return'), platformName, dateFrom,
 * dateTo (both inclusive, matched against the entry's calendar `date`).
 * All sums are computed in JS (mirrors the rest of this codebase's style)
 * since the dataset per query window is small (at most one entry per
 * station per day).
 */
// ─────────────────────────────────────────────────────────────────────────
// Dashboard stats — grand totals across stations/platforms, filterable
// ─────────────────────────────────────────────────────────────────────────
 
// Column-name aliases we sum against. Cell keys are whatever the admin
// typed into ChallanPlatformConfig (label/dispatch fixed columns), so we
// match case-insensitively and allow a couple of common spellings.
const COLUMN_ALIASES = {
  downloaded: ['downloaded'],
  packed: ['packed'],
  dispatched: ['dispatched'],
  cancelled: ['cancelled', 'cancel', 'canceled'],
  pending: ['pending'],
};
 
function normalizeKey(k) {
  return String(k || '').toLowerCase().trim();
}
 
/**
 * Sums row.cells values whose column name matches one of `columnNames`,
 * restricted to a given station and (optionally) verified/unverified only.
 */
function sumCellsByColumn(entries, { station, columnNames, onlyVerified } = {}) {
  const wanted = new Set(columnNames.map(normalizeKey));
  let sum = 0;
 
  entries.forEach((e) => {
    if (station && e.station !== station) return;
    if (onlyVerified !== undefined && Boolean(e.verified) !== onlyVerified) return;
 
    (e.platforms || []).forEach((p) => {
      (p.rows || []).forEach((r) => {
        Object.entries(r.cells || {}).forEach(([k, v]) => {
          if (wanted.has(normalizeKey(k))) {
            sum += Number(v) || 0;
          }
        });
      });
    });
  });
 
  return sum;
}
 
/**
 * Aggregates Challan Management figures for the common dashboard.
 * Filters: station ('label'|'dispatch'|'return'), platformName, dateFrom,
 * dateTo (both inclusive, matched against the entry's calendar `date`).
 * All sums are computed in JS (mirrors the rest of this codebase's style)
 * since the dataset per query window is small (at most one entry per
 * station per day).
 */
async function fetchChallanDashboardStats(filters = {}) {
  const { station, platformName, dateFrom, dateTo } = filters;
 
  const query = {};
  if (station) query.station = station;
  if (dateFrom || dateTo) {
    query.date = {};
    if (dateFrom) query.date.$gte = startOfDay(dateFrom);
    if (dateTo) query.date.$lte = startOfDay(dateTo);
  }
 
  const entries = await ChallanEntry.find(query).sort({ date: -1 });
 
  const byStation = { label: { total: 0, entries: 0 }, dispatch: { total: 0, entries: 0 }, return: { total: 0, entries: 0 } };
  const byPlatform = {}; // platformName -> { total, byStation: {label,dispatch,return} }
  let verifiedCount = 0;
  let pendingVerificationCount = 0;
  let totalReturnsFigure = 0; // hand-entered "TOTAL RETURNS" figure from Return station forms
 
  entries.forEach((e) => {
    byStation[e.station].total += e.grandTotal || 0;
    byStation[e.station].entries += 1;
    if (e.station !== 'label') {
      if (e.verified) verifiedCount += 1;
      else pendingVerificationCount += 1;
    }
    if (e.station === 'return' && typeof e.totalReturns === 'number') {
      totalReturnsFigure += e.totalReturns;
    }
 
    (e.platforms || []).forEach((p) => {
      if (platformName && p.platformName !== platformName) return;
      if (!byPlatform[p.platformName]) {
        byPlatform[p.platformName] = { platformName: p.platformName, total: 0, label: 0, dispatch: 0, return: 0 };
      }
      byPlatform[p.platformName].total += p.total || 0;
      byPlatform[p.platformName][e.station] += p.total || 0;
    });
  });
 
  // ── Dashboard summary cards (column-wise, across all platforms) ────────
  const columnStats = {
    totalDownloaded: sumCellsByColumn(entries, { station: 'label', columnNames: COLUMN_ALIASES.downloaded }),
    totalPacked: sumCellsByColumn(entries, { station: 'dispatch', columnNames: COLUMN_ALIASES.packed }),
    totalDispatched: sumCellsByColumn(entries, { station: 'dispatch', columnNames: COLUMN_ALIASES.dispatched }),
    totalCancel: sumCellsByColumn(entries, { station: 'dispatch', columnNames: COLUMN_ALIASES.cancelled }),
    totalPending: sumCellsByColumn(entries, { station: 'dispatch', columnNames: COLUMN_ALIASES.pending }),
    // Return station is a carrier matrix (no single "Returns" column name),
    // so "Total Returns" is the grand total of all Return-station rows.
    totalReturns: byStation.return.total,
    afterVerificationTotalDispatched: sumCellsByColumn(entries, {
      station: 'dispatch',
      columnNames: COLUMN_ALIASES.dispatched,
      onlyVerified: true,
    }),
    afterVerificationTotalReturns: entries
      .filter((e) => e.station === 'return' && e.verified)
      .reduce((sum, e) => sum + (e.grandTotal || 0), 0),
  };
 
  return {
    byStation,
    byPlatform: Object.values(byPlatform).sort((a, b) => b.total - a.total),
    verifiedCount,
    pendingVerificationCount,
    totalReturnsFigure,
    columnStats,
    entryCount: entries.length,
  };
}
 
 
 
/**
 * Deletes the challan entry for (station, date), regardless of its
 * saved/verified state. Admin-only — the route/controller layer is
 * responsible for enforcing that.
 */
async function deleteEntry(station, dateStr) {
  const date = startOfDay(dateStr);
  const deleted = await ChallanEntry.findOneAndDelete({ station, date });
  if (!deleted) throw new Error('No entry found for that station and date.');
  return deleted;
}
 
module.exports = {
  fetchOrBuildEntry,
  saveEntry,
  deleteEntry,
  verifyDispatchOrReturnEntry,
  fetchPendingVerifications,
  fetchChallanDashboardStats,
  sumCellsByColumn,
  LABEL_COLUMNS,
  DISPATCH_COLUMNS,
};
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
















