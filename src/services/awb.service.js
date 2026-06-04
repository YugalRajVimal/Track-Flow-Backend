const AWBRecord = require('../models/AWBRecord');
const { buildPagination, getTodayRange } = require('../utils/response');
const { createAuditLog } = require('../utils/auditLogger');

const POPULATE_OPTS = [
  { path: 'channelPartner', select: 'name code' },
  { path: 'brand', select: 'name code' },
  { path: 'createdBy', select: 'name email' },
];

const scanAWB = async ({ awbId, channelPartnerId, brandId, backDateScan, date }, userId, meta) => {
  const awbIdUpper = awbId ? awbId.toUpperCase() : awbId;
  const existing = await AWBRecord.findOne({ awbId: awbIdUpper });
  if (existing) {
    const err = new Error(`AWB ${awbIdUpper} already exists`);
    err.statusCode = 409;
    throw err;
  }

  let scannedAtValue = new Date();
  // If backDateScan is true and a valid date is provided, use that for scannedAt
  if (backDateScan && date) {
    // Accept both string and Date for compatibility from frontend
    scannedAtValue = new Date(date);
    // Optionally, ensure date is valid
    if (isNaN(scannedAtValue)) {
      const err = new Error('Invalid backdate provided for scan');
      err.statusCode = 400;
      throw err;
    }
  }

  const record = await AWBRecord.create({
    awbId: awbIdUpper,
    channelPartner: channelPartnerId,
    brand: brandId,
    status: 'dispatched',
    scannedAt: scannedAtValue,
    createdBy: userId,
  });

  await record.populate(POPULATE_OPTS);

  await createAuditLog({
    actionType: 'create',
    entity: 'AWBRecord',
    entityId: record._id,
    userId,
    newData: { awbId: record.awbId, status: record.status },
    ...meta,
  });

  return record;
};

const User = require('../models/User');

const cancelAWB = async (awbId, userId, meta) => {
  const awbIdUpper = awbId ? awbId.toUpperCase() : awbId;
  const record = await AWBRecord.findOne({ awbId: awbIdUpper });
  if (!record) {
    const err = new Error('AWB not found');
    err.statusCode = 404;
    throw err;
  }

  if (record.status === 'cancelled') {
    const err = new Error('AWB is already cancelled');
    err.statusCode = 400;
    throw err;
  }

  // Fetch the user (no passcode check)
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 403;
    throw err;
  }

  const oldData = { status: record.status };
  record.status = 'cancelled';
  record.cancelledAt = new Date();
  record.cancelledBy = userId;
  await record.save();

  await createAuditLog({
    actionType: 'cancel',
    entity: 'AWBRecord',
    entityId: record._id,
    userId,
    oldData,
    newData: { status: 'cancelled', cancelledAt: record.cancelledAt },
    ...meta,
  });

  return record;
};

const getAWBs = async (filters) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    status = '',
    channelPartnerId = '',
    brandId = '',
    startDate = '',
    endDate = '',
    sortBy = 'scannedAt',
    sortOrder = 'desc',
  } = filters;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Build base query for filters except status/date
  const baseQuery = {};
  if (search) {
    baseQuery.awbId = { $regex: search.toUpperCase(), $options: 'i' };
  }
  if (channelPartnerId) {
    baseQuery.channelPartner = channelPartnerId;
  }
  if (brandId) {
    baseQuery.brand = brandId;
  }
  if (status) {
    baseQuery.status = status;
  }

  // Date range logic
  let start, end;
  if (startDate || endDate) {
    start = startDate ? new Date(startDate) : undefined;
    end = endDate ? new Date(endDate) : undefined;
    if (end) end.setHours(23, 59, 59, 999);
  } else {
    const range = getTodayRange();
    start = range.start;
    end = range.end;
  }

  let queries = [];

  // If status "missing" is selected, filter only missing
  if (baseQuery.status === 'missing' || status === 'missing') {
    // Use missing window filter logic
    let missingQuery = { ...baseQuery, status: 'missing' };
    if (start || end) {
      if (start && end) {
        missingQuery.missingFromDate = { $lte: end };
        missingQuery.missingToDate = { $gte: start };
      } else if (start) {
        missingQuery.missingToDate = { $gte: start };
      } else if (end) {
        missingQuery.missingFromDate = { $lte: end };
      }
    }
    queries.push(missingQuery);
  } else if (!status && (startDate || endDate)) {
    // status filter empty, but date range selected: send both "normal" and "missing"
    // 1. Normal (non-missing)
    let normalQuery = { ...baseQuery, status: { $ne: 'missing' } };
    normalQuery.scannedAt = {};
    if (start) normalQuery.scannedAt.$gte = start;
    if (end) normalQuery.scannedAt.$lte = end;
    // Remove empty scannedAt object if no bounds
    if (Object.keys(normalQuery.scannedAt).length === 0) delete normalQuery.scannedAt;
    queries.push(normalQuery);
    // 2. Missing
    let missingQuery = { ...baseQuery, status: 'missing' };
    if (start && end) {
      missingQuery.missingFromDate = { $lte: end };
      missingQuery.missingToDate = { $gte: start };
    } else if (start) {
      missingQuery.missingToDate = { $gte: start };
    } else if (end) {
      missingQuery.missingFromDate = { $lte: end };
    }
    queries.push(missingQuery);
  } else {
    // normal (non-missing) or no special case
    let query = { ...baseQuery };
    // for non-missing, use createdAt for date
    if (query.status !== 'missing') {
      if (start || end) {
        query.scannedAt = {};
        if (start) query.scannedAt.$gte = start;
        if (end) query.scannedAt.$lte = end;
        if (Object.keys(query.scannedAt).length === 0) delete query.scannedAt;
      }
    }
    queries.push(query);
  }

  // If only one query, run as normal
  if (queries.length === 1) {
    const q = queries[0];
    const sortDir = sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortDir };
    const [records, total] = await Promise.all([
      AWBRecord.find(q)
        .populate(POPULATE_OPTS)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      AWBRecord.countDocuments(q),
    ]);
    return { records, pagination: buildPagination(page, limit, total) };
  } else {
    // For empty status & date selected, run $or for both normal & missing
    // Unify them as a single paginated list

    // Step 1: Combine queries with $or
    const orQuery = { $or: queries };
    const sortDir = sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortDir };

    const [records, total] = await Promise.all([
      AWBRecord.find(orQuery)
        .populate(POPULATE_OPTS)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      AWBRecord.countDocuments(orQuery),
    ]);
    return { records, pagination: buildPagination(page, limit, total) };
  }
};

const getAWBById = async (id) => {
  const record = await AWBRecord.findById(id).populate(POPULATE_OPTS);
  if (!record) {
    const err = new Error('AWB record not found');
    err.statusCode = 404;
    throw err;
  }
  return record;
};

const updateAWB = async (id, data, userId, meta) => {
  const record = await AWBRecord.findById(id);
  if (!record) {
    const err = new Error('AWB record not found');
    err.statusCode = 404;
    throw err;
  }

  // If updating awbId, check uniqueness
  let newAwbIdUpper;
  if (data.awbId && data.awbId !== record.awbId) {
    newAwbIdUpper = data.awbId.toUpperCase();
    const existing = await AWBRecord.findOne({ awbId: newAwbIdUpper, _id: { $ne: id } });
    if (existing) {
      const err = new Error(`AWB ID ${newAwbIdUpper} already exists`);
      err.statusCode = 409;
      throw err;
    }
  }

  const oldData = record.toObject();
  // Ensure awbId is saved in uppercase on update as well
  if (data.awbId) {
    data.awbId = data.awbId.toUpperCase();
  }
  Object.assign(record, data);
  await record.save();
  await record.populate(POPULATE_OPTS);

  await createAuditLog({
    actionType: 'update',
    entity: 'AWBRecord',
    entityId: record._id,
    userId,
    oldData,
    newData: record.toObject(),
    ...meta,
  });

  return record;
};

const deleteAWB = async (id, userId, meta) => {
  const record = await AWBRecord.findById(id);
  if (!record) {
    const err = new Error('AWB record not found');
    err.statusCode = 404;
    throw err;
  }

  await createAuditLog({
    actionType: 'delete',
    entity: 'AWBRecord',
    entityId: record._id,
    userId,
    oldData: record.toObject(),
    ...meta,
  });

  await record.deleteOne();
};

/**
 * Get AWBs for CSV export (no pagination, applies same filters)
 */
const getAWBsForExport = async (filters) => {
  const {
    search = '',
    status = '',
    channelPartnerId = '',
    brandId = '',
    startDate = '',
    endDate = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = filters;

  const query = {};

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  } else {
    const { start, end } = getTodayRange();
    query.createdAt = { $gte: start, $lte: end };
  }

  if (search) query.awbId = { $regex: search.toUpperCase(), $options: 'i' };
  if (status) query.status = status;
  if (channelPartnerId) query.channelPartner = channelPartnerId;
  if (brandId) query.brand = brandId;

  const sortDir = sortOrder === 'asc' ? 1 : -1;

  return AWBRecord.find(query)
    .populate([
      { path: 'channelPartner', select: 'name code' },
      { path: 'brand', select: 'name code' },
      { path: 'createdBy', select: 'name email' },
    ])
    .sort({ [sortBy]: sortDir });
};

const verifyPasscode = async (userId, passcode) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[verifyPasscode] Called with userId: ${userId}, passcode: ${passcode}`);
  }
  // Explicitly select passcode since it's select: false by default
  const user = await User.findById(userId).select('+passcode');
  if (!user) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[verifyPasscode] User not found for ID: ${userId}`);
    }
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  console.log(user);

  // Use the model method to compare hashed passcodes
  // Use the comparePasscode method from the User schema (see User.js)
  if (typeof passcode !== 'string' || !passcode) {
    const err = new Error('Passcode is required and must be a non-empty string');
    err.statusCode = 400;
    throw err;
  }
  if (typeof user.passcode !== 'string' || user.passcode.length === 0) {
    const err = new Error('Passcode not set for this user');
    err.statusCode = 500;
    throw err;
  }
  const isMatch = await user.comparePasscode(passcode);
  if (!isMatch) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[verifyPasscode] Invalid passcode for userId: ${userId}. Provided: ${passcode}`);
    }
    const err = new Error('Invalid passcode');
    err.statusCode = 400;
    throw err;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[verifyPasscode] Passcode verified for userId: ${userId}`);
  }
  return user;
};

module.exports = { scanAWB, cancelAWB, getAWBs, getAWBById, updateAWB, deleteAWB, getAWBsForExport,verifyPasscode };
