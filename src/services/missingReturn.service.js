
/**
 * missingAWB.service.js
 *
 * Two-phase flow:
 *   1. previewMissing  - parse file, cross-check DB, return missing rows (no writes)
 *   2. saveMissing     - bulk-insert confirmed missing rows into ReturnRecord
 *
 * Brand is now required for all ReturnRecord docs.
 */

const Papa = require('papaparse');
const XLSX = require('xlsx');
const ReturnRecord = require('../models/ReturnRecord');

// ---------------------------------------------------------------------------
// Partner detection
// ---------------------------------------------------------------------------

/**
 * Auto-detect the partner/format from the CSV/Excel headers.
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
 * Parse an uploaded file buffer into an array of plain row objects.
 * Handles CSV (any variant) and Excel (.xls / .xlsx).
 * For Excel files the sheet named "AWB wise Details" is preferred.
 *
 * @param {Buffer} buffer
 * @param {string} originalname  - used to decide CSV vs Excel
 * @returns {{ rows: object[], headers: string[] }}
 */
function parseFile(buffer, originalname) {
  const ext = originalname.split('.').pop().toLowerCase();

  // Excel path
  if (ext === 'xlsx' || ext === 'xls') {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

    // prefer "AWB wise Details"; fall back to first sheet
    const sheetName =
      workbook.SheetNames.find((n) => /awb\s*wise\s*details/i.test(n)) ||
      workbook.SheetNames[0];

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

    return { rows, headers };
  }

  // CSV path
  const rawText = buffer.toString('utf8');

  // Problem: Myntra (and some portals) wraps every CSV field in TRIPLE
  // double-quotes, e.g.  """MYSC1299918394"""
  //
  // PapaParse treats the outer pair as the RFC-4180 quote wrapper and the
  // leftover lone quote at the start of the file as an unclosed quoted field,
  // so the entire file ends up as one giant row with __parsed_extra overflow.
  //
  // Fix: collapse any run of 2+ consecutive double-quotes to a single
  // double-quote before handing the text to PapaParse.  This normalises the
  // quoting while preserving the structure PapaParse needs.
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
 * Each extractor receives a cleaned row and returns { awbId, missingAt }
 * or null if the row should be skipped.
 *
 * We ensure the awbId is always uppercase here.
 */
function extractFlipkart(row) {
  const awbId = String(row['Tracking ID'] || '').trim();
  if (!awbId) return null;

  const missingAt = parseDMY(row['Order Date']);
  return { awbId: awbId.toUpperCase(), missingAt };
}

function extractMeesho(row) {
  // Only extract rows where Reason for Credit Entry is "SHIPPED"
  const reason = String(row['Reason for Credit Entry'] || '').trim().toLowerCase();
  if (reason !== 'shipped' && reason !== 'delivered') return null;

  // Extract AWB/Packet Id and Order Date fields
  const awbId = String(row['Packet Id'] || '').trim().toUpperCase();
  if (!awbId) return null;

  const missingAt = parseDMY(row['Order Date']);

  // This returned object will later be compared against DB data (only if shipped)
  return { awbId, missingAt };
}

function extractMyntra(row) {
  // Quote-stripping is already handled by parseFile's cleanRows pass.
  // AWB Number arrives here as a plain string, e.g. "MYSC1299918394".
  const awbId = String(row['AWB Number'] || '').trim();
  if (!awbId) return null;

  // Myntra date format: "DD-MM-YYYY HH:mm:ss"
  // parseDMY handles this correctly.
  const missingAt = parseDMY(row['Shipping Date']);
  return { awbId: awbId.toUpperCase(), missingAt };
}

function extractWebsite(row) {
  const awbId = String(row['AWB NO.'] || '').trim();
  if (!awbId) return null;

  const missingAt = parseDMY(row['Dispatch by date']);
  return { awbId: awbId.toUpperCase(), missingAt };
}

const EXTRACTORS = {
  flipkart: extractFlipkart,
  meesho:   extractMeesho,
  myntra:   extractMyntra,
  website:  extractWebsite,
};

// ---------------------------------------------------------------------------
// Phase 1 - Preview missing AWBs (no DB writes)
// ---------------------------------------------------------------------------

/**
 * @param {Buffer}   fileBuffer
 * @param {string}   originalname
 * @param {string}   channelPartnerId   - MongoDB ObjectId string
 * @param {string}   brandId            - MongoDB ObjectId string (required)
 * @param {string}   startDate          - ISO / YYYY-MM-DD
 * @param {string}   endDate            - ISO / YYYY-MM-DD
 * @param {ObjectId} userId             - the logged-in user's _id
 *
 * @returns {{ partner, totalInFile, missing[] }}
 */
const previewMissing = async ({
  fileBuffer,
  originalname,
  channelPartnerId,
  brandId,           // <--- required
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

  // 3. Extract AWB IDs from file, ensuring awbId is uppercase already due to updated extractors
  const fileItems = [];
  for (const row of rows) {
    const item = extract(row);
    if (item && item.awbId) fileItems.push(item);
  }

  if (fileItems.length === 0) {
    const err = new Error('No valid AWB entries found in the file after filtering.');
    err.statusCode = 422;
    throw err;
  }

  const fileAwbIds = fileItems.map((i) => i.awbId);

  // 4. Query DB for AWBs in the date range, channel partner, brand, and status "dispatched" only
  const start = new Date(startDate);
  const end   = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const dbQuery = {
    channelPartner: channelPartnerId,
    brand: brandId,
    scannedAt: { $gte: start, $lte: end },
    awbId: { $in: fileAwbIds },
    status: 'dispatched', // <--- Only consider dispatched records as "existing in DB"
  };

  const existingRecords = await ReturnRecord.find(dbQuery).select('awbId').lean();
  const existingSet = new Set(existingRecords.map((r) => String(r.awbId).toUpperCase()));

  // 5. Find missing (present in file, absent in DB "dispatched" data)
  const missing = fileItems.filter((item) => !existingSet.has(item.awbId));

  if (missing.length === 0) {
    return { partner, totalInFile: fileItems.length, missing: [] };
  }

  // 6. Shape response rows. Ensure .awbId is uppercase.
  // REQUIRED: Both channelPartner and brand MUST be set
  const missingRows = missing.map((item) => ({
    awbId:          item.awbId.toUpperCase(),
    channelPartner: channelPartnerId,
    brand:          brandId,
    status:         'missing',
    missingAt:      item.missingAt,
    missingBy:      userId,
    createdBy:      userId,
  }));

  return {
    partner,
    totalInFile: fileItems.length,
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
 * @param {Array}    rows    - array of objects returned by previewMissing
 * @param {ObjectId} userId  - the logged-in user
 * @returns {{ saved: number, skipped: number }}
 */
/**
 * Bulk-insert missing rows using ordered:false so a duplicate awbId (re-run)
 * does not abort the whole batch - it is counted as skipped instead.
 *
 * @param {Array}    rows          - array of objects returned by previewMissing (must include brand)
 * @param {ObjectId} userId        - the logged-in user
 * @param {string|Date} missingFrom - Start date for missing range (YYYY-MM-DD or Date)
 * @param {string|Date} missingTo   - End date for missing range (YYYY-MM-DD or Date)
 * @returns {{ saved: number, skipped: number }}
 */
const saveMissing = async (rows, userId, missingFrom, missingTo) => {
  // Console log for basic input check
  console.log('[saveMissing] rows.length:', Array.isArray(rows) ? rows.length : 'invalid', 'userId:', userId);
  console.log('[saveMissing] missingFrom:', missingFrom, 'missingTo:', missingTo);

  if (!Array.isArray(rows) || rows.length === 0) {
    console.log('[saveMissing] No rows to save, throwing error.');
    const err = new Error('No rows to save.');
    err.statusCode = 400;
    throw err;
  }

  // Validate missingFrom and missingTo
  if (!missingFrom || !missingTo) {
    console.log('[saveMissing] missingFrom or missingTo date missing.');
    const err = new Error('missingFrom and missingTo dates are required.');
    err.statusCode = 400;
    throw err;
  }

  // Parse and normalize missingFromDate and missingToDate to full Date range
  const fromDate = new Date(missingFrom);
  fromDate.setHours(0,0,0,0);
  const toDate = new Date(missingTo);
  toDate.setHours(23,59,59,999);

  // Brand is now REQUIRED for every record
  const docs = rows.map((row, idx) => {
    if (!row.brand) {
      console.log(`[saveMissing] Row at index ${idx} missing brand:`, row);
      throw Object.assign(
        new Error('Brand is required for each row.'),
        { statusCode: 400 }
      );
    }
    return {
      awbId:            String(row.awbId).toUpperCase(),
      channelPartner:   row.channelPartner,
      brand:            row.brand, // must exist
      status:           'missing',
      scannedAt:        row.missingAt || new Date(),
      missingAt:        row.missingAt || new Date(),
      missingFromDate:  fromDate,
      missingToDate:    toDate,
      missingBy:        userId,
      createdBy:        userId,
    };
  });

  console.log('[saveMissing] Prepared to insert docs count:', docs.length);

  let saved   = 0;
  let skipped = 0;

  try {
    const result = await ReturnRecord.insertMany(docs, {
      ordered: false,
      rawResult: true,
    });
    saved = result.insertedCount ?? docs.length;
    console.log(`[saveMissing] Inserted count: ${saved}`);
  } catch (bulkErr) {
    // ordered:false throws a BulkWriteError even on partial success
    if (bulkErr.name === 'MongoBulkWriteError' || bulkErr.code === 11000) {
      saved   = bulkErr.result?.nInserted ?? 0;
      skipped = docs.length - saved;
      console.log(`[saveMissing] BulkWriteError: saved=${saved}, skipped=${skipped}`);
    } else {
      console.log('[saveMissing] Non-BulkWriteError, rethrowing:', bulkErr);
      throw bulkErr;
    }
  }

  console.log(`[saveMissing] Finished: saved=${saved}, skipped=${skipped}`);
  return { saved, skipped };
};

module.exports = { previewMissing, saveMissing };