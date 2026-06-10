const OfflineRecord = require('../models/OfflineRecords');
const { buildPagination, getTodayRange } = require('../utils/response');

/**
 * Normalize and defensively map OfflineRecord payload for both add & edit
 * Handles: casing, field aliasing, string=>number, trimming, etc.
 */
function normalizeOfflineRecordPayload(data) {
  const incoming = { ...data };

  // Alias 'challanNumber' -> 'challanNo'
  if (incoming.challanNumber && !incoming.challanNo) {
    incoming.challanNo = incoming.challanNumber;
    delete incoming.challanNumber;
  }

  // Defensive for string payment
  if (typeof incoming.payment === 'string') {
    incoming.payment = incoming.payment.trim().toUpperCase();
  }

  // Defensive for partyName, challanNo, salesman, remark
  if (typeof incoming.partyName === 'string') incoming.partyName = incoming.partyName.trim();
  if (typeof incoming.challanNo === 'string') incoming.challanNo = incoming.challanNo.trim();
  if (typeof incoming.salesman === 'string') incoming.salesman = incoming.salesman.trim();
  if (typeof incoming.remark === 'string') incoming.remark = incoming.remark.trim();

  // Defensive for totalQty, totalAmount fields (should be numbers)
  if (typeof incoming.totalQty === 'string') {
    incoming.totalQty = parseInt(incoming.totalQty, 10);
    if (isNaN(incoming.totalQty)) incoming.totalQty = undefined;
  }
  if (typeof incoming.totalAmount === 'string') {
    incoming.totalAmount = parseFloat(incoming.totalAmount);
    if (isNaN(incoming.totalAmount)) incoming.totalAmount = undefined;
  }

  // Normalize styleTypes: expect either .styleTypes (array) or .styleType/.qty from legacy clients
  if (Array.isArray(incoming.styleTypes)) {
    // Defensive: map all styleTypes to {type, qty}, trim/parse fields as necessary
    incoming.styleTypes = incoming.styleTypes.map((st) => {
      let type = typeof st.type === 'string' ? st.type.trim() : '';
      let qty = st.qty;
      if (typeof qty === 'string') {
        qty = parseInt(qty, 10);
        if (isNaN(qty)) qty = undefined;
      }
      return { type, qty };
    }).filter(x => x.type && x.qty);
  } else if (typeof incoming.styleType === 'string' && incoming.qty) {
    // Fallback support: single item - migrate to styleTypes
    let qty = incoming.qty;
    if (typeof qty === 'string') {
      qty = parseInt(qty, 10);
      if (isNaN(qty)) qty = undefined;
    }
    incoming.styleTypes = [{ type: incoming.styleType.trim(), qty }];
    delete incoming.styleType;
    delete incoming.qty;
  }

  return incoming;
}

/**
 * Create a new OfflineRecord
 * Also adds partyName to OfflineDropdown.partyNames if not already present.
 */
const addOfflineRecord = async (recordData) => {
  const normalized = normalizeOfflineRecordPayload(recordData);

  // Check for unique challanNo
  const existing = await OfflineRecord.findOne({ challanNo: normalized.challanNo });
  if (existing) {
    const err = new Error('Challan number must be unique');
    err.statusCode = 400;
    throw err;
  }

  // Add partyName to OfflineDropdown.partyNames if not already present
  if (normalized.partyName && typeof normalized.partyName === 'string') {
    const OfflineDropdown = require('../models/OfflineData');
    let dropdown = await OfflineDropdown.findOne();
    if (!dropdown) {
      dropdown = new OfflineDropdown({
        styleTypes: [],
        salesMen: [],
        partyNames: [{ name: normalized.partyName }]
      });
      await dropdown.save();
    } else {
      const exists = dropdown.partyNames.some(
        (p) => typeof p.name === 'string' && p.name.trim().toLowerCase() === normalized.partyName.trim().toLowerCase()
      );
      if (!exists) {
        dropdown.partyNames.push({ name: normalized.partyName });
        await dropdown.save();
      }
    }
  }

  const record = await OfflineRecord.create(normalized);
  return record;
};

/**
 * Edit/Update an existing OfflineRecord
 * Also adds new partyName to OfflineDropdown.partyNames if it is changed and doesn't exist.
 */
const editOfflineRecord = async (id, updates) => {
  const record = await OfflineRecord.findById(id);
  if (!record) {
    const err = new Error('Offline record not found');
    err.statusCode = 404;
    throw err;
  }

  const normalized = normalizeOfflineRecordPayload(updates);

  // If challanNo is being changed, enforce uniqueness
  if (
    typeof normalized.challanNo !== 'undefined' &&
    normalized.challanNo !== record.challanNo
  ) {
    const existing = await OfflineRecord.findOne({ challanNo: normalized.challanNo });
    if (existing) {
      const err = new Error('Challan number must be unique');
      err.statusCode = 400;
      throw err;
    }
  }

  // If updating partyName, check and add to OfflineDropdown if needed
  if (
    typeof normalized.partyName !== 'undefined' &&
    normalized.partyName &&
    normalized.partyName !== record.partyName
  ) {
    const OfflineDropdown = require('../models/OfflineData');
    let dropdown = await OfflineDropdown.findOne();
    if (!dropdown) {
      dropdown = new OfflineDropdown({
        styleTypes: [],
        salesMen: [],
        partyNames: [{ name: normalized.partyName }]
      });
      await dropdown.save();
    } else {
      const exists = dropdown.partyNames.some(
        (p) => typeof p.name === 'string' && p.name.trim().toLowerCase() === normalized.partyName.trim().toLowerCase()
      );
      if (!exists) {
        dropdown.partyNames.push({ name: normalized.partyName });
        await dropdown.save();
      }
    }
  }

  // Only copy valid fields from normalized - prevent overwriting existing fields not provided in update
  for (const field of [
    'partyName', 'challanNo', 'salesman', 'styleTypes',
    'totalQty', 'totalAmount', 'payment', 'remark'
  ]) {
    if (typeof normalized[field] !== 'undefined') {
      record[field] = normalized[field];
    }
  }

  await record.save();
  return record;
};

/**
 * Delete an existing OfflineRecord
 */
const deleteOfflineRecord = async (id) => {
  const record = await OfflineRecord.findById(id);
  if (!record) {
    const err = new Error('Offline record not found');
    err.statusCode = 404;
    throw err;
  }
  await record.deleteOne();
  return { deleted: true };
};

/**
 * Fetch paginated OfflineRecords
 * Supports: page, limit, search (partyName), payment, startDate, endDate
 */
const fetchOfflineRecords = async ({
  page = 1,
  limit = 10,
  search = '',
  payment = '',
  startDate = '',
  endDate = '',
  sortBy = 'createdAt',
  sortOrder = 'desc',
  partyName = '' // add partyName filter support (to align with OfflineManagement.jsx & UI filters)
} = {}) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const filter = {};

  // partyName filter: if provided, filter ONLY by partyName (partial/regex match for UI experience)
  if (partyName && typeof partyName === 'string' && partyName.trim().length > 0) {
    filter.partyName = { $regex: partyName.trim(), $options: 'i' };
  }

  // Search on partyName OR salesman, but NOT if partyName filter is specifically set
  if (
    search &&
    typeof search === 'string' &&
    search.trim().length > 0 &&
    !filter.partyName // avoid clash with partyName-specific filter
  ) {
    const searchRegex = { $regex: search.trim(), $options: 'i' };
    filter.$or = [
      { partyName: searchRegex },
      { salesman: searchRegex },
    ];
  }

  // payment filter (CASH/DUE/UPI)
  if (payment && typeof payment === 'string' && payment.trim().length > 0) {
    filter.payment = payment.trim().toUpperCase();
  }

  // Date filtering (createdAt)
  let start, end;
  if (startDate || endDate) {
    start = startDate ? new Date(startDate) : undefined;
    end = endDate ? new Date(endDate) : undefined;
    if (end) end.setHours(23, 59, 59, 999);
    filter.createdAt = {};
    if (start) filter.createdAt.$gte = start;
    if (end) filter.createdAt.$lte = end;
    if (!Object.keys(filter.createdAt).length) delete filter.createdAt;
  } else {
    // If no date filter, default to today
    const today = getTodayRange();
    filter.createdAt = { $gte: today.start, $lte: today.end };
  }

  // Sorting
  const sortDir = sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortBy]: sortDir };

  // For debugging
  console.log('[fetchOfflineRecords] filter:', JSON.stringify(filter, null, 2));
  console.log('[fetchOfflineRecords] sort:', sort);
  console.log('[fetchOfflineRecords] page:', page, 'limit:', limit, 'skip:', skip);

  // Query
  const [records, total] = await Promise.all([
    OfflineRecord.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit)),
    OfflineRecord.countDocuments(filter),
  ]);

  return {
    records,
    pagination: buildPagination(page, limit, total),
  };
};

/**
 * Fetch one record by ID
 */
const getOfflineRecordById = async (id) => {
  const record = await OfflineRecord.findById(id);
  if (!record) {
    const err = new Error('Offline record not found');
    err.statusCode = 404;
    throw err;
  }
  return record;
};

/**
 * Fetch all records for export (no pagination, can apply filters)
 */
const fetchOfflineRecordsForExport = async (filters = {}) => {
  const {
    search = '',
    payment = '',
    startDate = '',
    endDate = '',
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = filters;

  const filter = {};

  if (search && typeof search === 'string' && search.length > 0)
    filter.partyName = { $regex: search, $options: 'i' };
  if (payment && typeof payment === 'string' && payment.length > 0)
    filter.payment = payment.trim().toUpperCase();

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
    if (!Object.keys(filter.createdAt).length) delete filter.createdAt;
  } else {
    const { start, end } = getTodayRange();
    filter.createdAt = { $gte: start, $lte: end };
  }

  const sortDir = sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortBy]: sortDir };

  return OfflineRecord.find(filter).sort(sort);
};

module.exports = {
  addOfflineRecord,
  editOfflineRecord,
  deleteOfflineRecord,
  fetchOfflineRecords,
  getOfflineRecordById,
  fetchOfflineRecordsForExport,
};
