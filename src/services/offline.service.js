const OfflineRecord = require('../models/OfflineRecords');
const { buildPagination, getTodayRange } = require('../utils/response');

/**
 * Create a new OfflineRecord
 * Defensive: transform field names, ensure types
 */
const addOfflineRecord = async (recordData) => {
  // Defensive: Allow backend to handle potential frontend inconsistencies in naming/casing/types

  // Handle both 'challanNo' and 'challanNumber' from the payload (as seen in logs)
  let incoming = { ...recordData };

  // Support frontend sending 'challanNumber' (should be 'challanNo' in schema)
  if (incoming.challanNumber && !incoming.challanNo) {
    incoming.challanNo = incoming.challanNumber;
    delete incoming.challanNumber;
  }

  // If qty or totalQty are strings, convert to numbers
  if (typeof incoming.qty === 'string') {
    incoming.qty = parseInt(incoming.qty, 10);
    if (isNaN(incoming.qty)) incoming.qty = undefined;
  }
  if (typeof incoming.totalQty === 'string') {
    incoming.totalQty = parseInt(incoming.totalQty, 10);
    if (isNaN(incoming.totalQty)) incoming.totalQty = undefined;
  }

  // Defensively uppercase payment (should be CASH/DUE/UPI in schema)
  if (typeof incoming.payment === 'string') {
    incoming.payment = incoming.payment.trim().toUpperCase();
  }

  // Defensive for partyName & styleType: trim
  if (typeof incoming.partyName === 'string') incoming.partyName = incoming.partyName.trim();
  if (typeof incoming.styleType === 'string') incoming.styleType = incoming.styleType.trim();

  // Defensive for remark: trim if string
  if (typeof incoming.remark === 'string') incoming.remark = incoming.remark.trim();

  const record = await OfflineRecord.create(incoming);
  return record;
};

/**
 * Edit/Update an existing OfflineRecord
 * Performs same defensive field mapping/type handling as add
 */
const editOfflineRecord = async (id, updates) => {
  const record = await OfflineRecord.findById(id);
  if (!record) {
    const err = new Error('Offline record not found');
    err.statusCode = 404;
    throw err;
  }

  // Support frontend sending 'challanNumber' as update field
  if (updates.challanNumber && !updates.challanNo) {
    updates.challanNo = updates.challanNumber;
    delete updates.challanNumber;
  }

  if (typeof updates.qty === 'string') {
    updates.qty = parseInt(updates.qty, 10);
    if (isNaN(updates.qty)) updates.qty = undefined;
  }

  if (typeof updates.totalQty === 'string') {
    updates.totalQty = parseInt(updates.totalQty, 10);
    if (isNaN(updates.totalQty)) updates.totalQty = undefined;
  }

  if (typeof updates.payment === 'string') {
    updates.payment = updates.payment.trim().toUpperCase();
  }

  if (typeof updates.partyName === 'string') updates.partyName = updates.partyName.trim();
  if (typeof updates.styleType === 'string') updates.styleType = updates.styleType.trim();
  if (typeof updates.remark === 'string') updates.remark = updates.remark.trim();

  Object.assign(record, updates);
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
  sortOrder = 'desc'
} = {}) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const filter = {};

  if (search && typeof search === 'string' && search.trim().length > 0) {
    filter.partyName = { $regex: search.trim(), $options: 'i' };
  }
  if (payment && typeof payment === 'string' && payment.trim().length > 0) {
    filter.payment = payment.trim().toUpperCase();
  }

  // Handle date filtering
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
    // Default to today
    const today = getTodayRange();
    filter.createdAt = { $gte: today.start, $lte: today.end };
  }

  // Build sort
  const sortDir = sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortBy]: sortDir };

  // Fetch
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

  if (search) filter.partyName = { $regex: search, $options: 'i' };
  if (payment) filter.payment = payment.trim().toUpperCase();

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
