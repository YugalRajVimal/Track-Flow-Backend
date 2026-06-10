
/**
 * missingAWB.service.js
 *
 * Two-phase flow:
 *   1. previewMissing  - parse file, cross-check DB, return AWBs in DB but missing from file (no writes)
 *   2. saveMissing     - bulk-insert confirmed missing rows into AWBRecord
 *
 * Brand is now required as per AWBRecord.js schema.
 */

const Papa = require('papaparse');
const AWBRecord = require('../models/AWBRecord');

// ---------------------------------------------------------------------------
// Partner detection
// ---------------------------------------------------------------------------

/**
 * Auto-detect the partner/format from the CSV headers.
 * Returns: 'flipkart' | 'meesho' | 'myntra' | 'website' | null
 */
function detectPartner(headers) {
  const h = headers.map((s) => String(s).trim().toLowerCase());

  if (h.includes('tracking id')) return 'flipkart';
  if (h.includes('packet id'))   return 'meesho';
  if (h.includes('awb number'))  return 'myntra';
  if (h.includes('awb no.'))     return 'website';

  return null;
}

// ---------------------------------------------------------------------------
// Date helper
// ---------------------------------------------------------------------------

/**
 * Parse a date string that may be in DD-MM-YYYY or DD-MM-YYYY HH:mm:ss format
 * (as Myntra exports), OR a standard ISO / JS-parseable string.
 * Always returns a valid Date; falls back to now() on parse failure.
 */
function parseDMY(raw) {
  if (!raw || String(raw).trim() === '' || String(raw).trim() === 'N/A') {
    return new Date();
  }

  // Matches "27-05-2026" or "27-05-2026 09:34:48"
  const dmyMatch = String(raw).trim().match(/^(\d{2})-(\d{2})-(\d{4})(?:\s+(.*))?$/);
  if (dmyMatch) {
    const [, dd, mm, yyyy, time] = dmyMatch;
    // Build a proper ISO string so new Date() parses it unambiguously
    const iso = `${yyyy}-${mm}-${dd}${time ? 'T' + time : 'T00:00:00'}`;
    const d = new Date(iso);
    return isNaN(d) ? new Date() : d;
  }

  // Fallback: let JS try to parse it (handles ISO 8601, RFC 2822, etc.)
  const d = new Date(raw);
  return isNaN(d) ? new Date() : d;
}

// ---------------------------------------------------------------------------
// File parsing
// ---------------------------------------------------------------------------

/**
 * Parse an uploaded CSV file buffer into an array of plain row objects.
 * All sheets are CSV.
 *
 * @param {Buffer} buffer
 * @param {string} originalname
 * @returns {{ rows: object[], headers: string[] }}
 */
function parseFile(buffer, originalname) {
  const rawText = buffer.toString('utf8');
  const text = rawText.replace(/"""/g, '');
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    quoteChar: '"',
    transformHeader: (h) => h.trim(),
  });

  const headers = result.meta?.fields || [];

  // Strip any residual wrapping quotes AND leading/trailing whitespace from
  // every cell value so extractors always receive clean strings.
  const cleanRows = result.data.map((row) => {
    const cleaned = {};
    for (const [key, val] of Object.entries(row)) {
      cleaned[key] =
        typeof val === 'string' ? val.trim().replace(/^"+|"+$/g, '') : val;
    }
    return cleaned;
  });

  return { rows: cleanRows, headers };
}

// ---------------------------------------------------------------------------
// Row extractors - one per partner
// ---------------------------------------------------------------------------

/**
 * Each extractor receives a cleaned row and returns { awbId, missingAt, brand }
 * or null if the row should be skipped.
 *
 * Brand must be attached by file, user, or other input; if not present in the row,
 * it must be provided elsewhere.
 */
function extractFlipkart(row) {
  const awbId = String(row['Tracking ID'] || '').trim().toUpperCase();
  if (!awbId) return null;
  const missingAt = parseDMY(row['Order Date']);
  return { awbId, missingAt };
}

function extractMeesho(row) {
  const reason = String(row['Reason for Credit Entry'] || '').trim().toLowerCase();
  if (reason !== 'shipped' && reason !== 'delivered') return null;

  const awbId = String(row['Packet Id'] || '').trim().toUpperCase();
  if (!awbId) return null;

  const missingAt = parseDMY(row['Order Date']);
  return { awbId, missingAt };
}

function extractMyntra(row) {
  const awbId = String(row['AWB Number'] || '').trim().toUpperCase();
  if (!awbId) return null;
  const missingAt = parseDMY(row['Shipping Date']);
  return { awbId, missingAt };
}

/**
 * For Website files (CSV only): only include rows where "Order Status" is "DELIVERED" or "IN-TRANSIT"
 */
function extractWebsite(row) {
  const awbId = String(row['AWB NO.'] || '').trim().toUpperCase();
  if (!awbId) return null;
  const status = String(row['Order Status'] || '').trim().toUpperCase();
  if (status !== 'DELIVERED' && status !== 'IN-TRANSIT') return null;
  const missingAt = parseDMY(row['Dispatch by date']);
  return { awbId, missingAt };
}

const EXTRACTORS = {
  flipkart: extractFlipkart,
  meesho:   extractMeesho,
  myntra:   extractMyntra,
  website:  extractWebsite,
};

// ---------------------------------------------------------------------------
// Phase 1 - Preview DB AWBs missing in uploaded file (no DB writes)
// ---------------------------------------------------------------------------

/**
 * @param {Buffer}   fileBuffer
 * @param {string}   originalname
 * @param {string}   channelPartnerId - MongoDB ObjectId string
 * @param {string}   brandId         - MongoDB ObjectId string; now required
 * @param {string}   startDate       - ISO / YYYY-MM-DD
 * @param {string}   endDate         - ISO / YYYY-MM-DD
 * @param {ObjectId} userId          - logged-in user _id
 *
 * @returns {{ partner, totalInDB, missingInFile[] }}
 *
 * Returns AWBs that exist in DB but are missing from uploaded file.
 */
const previewMissing = async ({
  fileBuffer,
  originalname,
  channelPartnerId,
  brandId,
  startDate,
  endDate,
  userId,
}) => {
  // 1. Parse file
  const { rows, headers } = parseFile(fileBuffer, originalname);

  if (rows.length === 0) {
    const err = new Error('The uploaded file contains no data rows.');
    err.statusCode = 422;
    throw err;
  }

  // 2. Detect partner format
  const partner = detectPartner(headers);
  if (!partner) {
    const err = new Error(
      'Could not detect the file format. Expected one of: ' +
      'Flipkart (Tracking ID), Meesho (Packet Id), Myntra (AWB Number), ' +
      'or Website Excel (AWB NO.).'
    );
    err.statusCode = 422;
    throw err;
  }

  if (!brandId) {
    const err = new Error('Brand is required.');
    err.statusCode = 422;
    throw err;
  }

  const extract = EXTRACTORS[partner];

  // 3. Extract AWB IDs from file
  const fileItems = [];
  for (const row of rows) {
    const item = extract(row);
    if (item && item.awbId) {
      item.brand = brandId;
      fileItems.push(item);
    }
  }

  const fileAwbIds = fileItems.map((i) => i.awbId);
  const fileAwbIdSet = new Set(fileAwbIds);

  // 4. Query DB for AWBs in the date range, channel partner, brand, and status "dispatched" only
  const start = new Date(startDate);
  const end   = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const dbQuery = {
    channelPartner: channelPartnerId,
    scannedAt: { $gte: start, $lte: end },
    ...(brandId ? { brand: brandId } : {}),
    status: 'dispatched',
  };

  // Find all AWBs in DB in the range, only with status 'dispatched'
  const dbRecords = await AWBRecord.find(dbQuery).lean();
  const totalInDB = dbRecords.length;

  // 5. Find missing in file (present in DB, absent in file)
  const missingInFile = dbRecords.filter((record) => !fileAwbIdSet.has(record.awbId));

  if (missingInFile.length === 0) {
    return { partner, totalInDB, missing: [] };
  }

  // 6. Shape response rows
  const missingRows = missingInFile.map((record) => ({
    awbId:           record.awbId,
    channelPartner:  record.channelPartner,
    brand:           record.brand,
    status:          'missing_in_file',
    missingAt:       record.scannedAt || null,
    missingBy:       userId,
    createdBy:       userId,
  }));

  return {
    partner,
    totalInDB,
    missing: missingRows,
  };
};

// ---------------------------------------------------------------------------
// Phase 2 - Save confirmed missing AWBs
// ---------------------------------------------------------------------------

/**
 * Bulk-insert missing rows using ordered:false so a duplicate awbId (re-run)
 * does not abort the whole batch - it is counted as skipped instead.
 *
 * @param {Array}    rows    - array of objects returned by previewMissing;
 *                            each must include brand (required).
 * @param {ObjectId} userId  - the logged-in user
 * @returns {{ saved: number, skipped: number }}
 */
/**
 * Save confirmed missing AWBs (bulk-insert).
 * Accepts explicit missingFromDate and missingToDate (must be provided and validated in controller).
 *
 * @param {Array}    rows             - Array of missing AWB objects (from preview, each must include brand).
 * @param {ObjectId} userId           - The logged-in user's ID.
 * @param {string|Date} missingFrom   - Start date for missing range (YYYY-MM-DD or Date).
 * @param {string|Date} missingTo     - End date for missing range (YYYY-MM-DD or Date).
 * @returns {{ saved: number, skipped: number }}
 * 
 * 
 */

const saveMissing = async (rows, userId, missingFrom, missingTo) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    const err = new Error('No rows to process.');
    err.statusCode = 400;
    throw err;
  }
  // Require brand in all rows
  const missingBrandCount = rows.filter(r => !r.brand).length;
  if (missingBrandCount > 0) {
    const err = new Error('Brand is required for all rows.');
    err.statusCode = 400;
    throw err;
  }

  // Validate missingFrom and missingTo
  if (!missingFrom || !missingTo) {
    const err = new Error('missingFrom and missingTo dates are required.');
    err.statusCode = 400;
    throw err;
  }

  // Parse and normalize missingFromDate and missingToDate to full Date range
  const fromDate = new Date(missingFrom);
  fromDate.setHours(0, 0, 0, 0);
  const toDate = new Date(missingTo);
  toDate.setHours(23, 59, 59, 999);

  // Convert all AWB IDs to uppercase for lookup consistency
  const awbIds = rows.map(r => (r.awbId || '').toUpperCase()).filter(Boolean);

  // Find all AWBRecords matching these AWB IDs (already present in db)
  const existingRecords = await AWBRecord.find({ awbId: { $in: awbIds } });

  if (existingRecords.length === 0) {
    // Nothing to mark as missing
    return { saved: 0, skipped: rows.length };
  }

  // Collect AWB IDs that exist in db
  const existingAwbIdSet = new Set(existingRecords.map(rec => rec.awbId));

  // Only rows whose awbId is present in db should be updated
  const toUpdateAwbIds = rows
    .map(r => (r.awbId || '').toUpperCase())
    .filter(awbid => existingAwbIdSet.has(awbid));

  if (toUpdateAwbIds.length === 0) {
    return { saved: 0, skipped: rows.length };
  }

  // Update their status to 'missing', set missingFromDate, missingToDate, missingBy, etc.
  const updateResult = await AWBRecord.updateMany(
    { awbId: { $in: toUpdateAwbIds } },
    {
      $set: {
        status: "missing",
        missingFromDate: fromDate,
        missingToDate: toDate,
        missingBy: userId,
        // Optionally update missingAt as well if present in input row
        // but bulk update can't set per-row values, so we keep existing missingAt
      }
    }
  );

  const saved = updateResult.modifiedCount || 0;
  const skipped = rows.length - saved;

  return { saved, skipped };
};

module.exports = { previewMissing, saveMissing };