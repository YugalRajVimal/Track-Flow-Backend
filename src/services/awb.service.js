const AWBRecord = require('../models/AWBRecord');
const { buildPagination, getTodayRange } = require('../utils/response');
const { createAuditLog } = require('../utils/auditLogger');

const POPULATE_OPTS = [
  { path: 'channelPartner', select: 'name code' },
  { path: 'brand', select: 'name code' },
  { path: 'createdBy', select: 'name email' },
];

const scanAWB = async ({ awbId, channelPartnerId, brandId }, userId, meta) => {
  const awbIdUpper = awbId ? awbId.toUpperCase() : awbId;
  const existing = await AWBRecord.findOne({ awbId: awbIdUpper });
  if (existing) {
    const err = new Error(`AWB ${awbIdUpper} already exists`);
    err.statusCode = 409;
    throw err;
  }

  const record = await AWBRecord.create({
    awbId: awbIdUpper,
    channelPartner: channelPartnerId,
    brand: brandId,
    status: 'dispatched',
    scannedAt: new Date(),
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
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = filters;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const query = {};

  // Date range — default to today if none provided
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  } else {
    const { start, end } = getTodayRange();
    query.createdAt = { $gte: start, $lte: end };
  }

  if (search) {
    // Match uppercase for search as well (case-insensitive)
    query.awbId = { $regex: search.toUpperCase(), $options: 'i' };
  }

  if (status) {
    query.status = status;
  }

  if (channelPartnerId) {
    query.channelPartner = channelPartnerId;
  }

  if (brandId) {
    query.brand = brandId;
  }

  const sortDir = sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortBy]: sortDir };

  const [records, total] = await Promise.all([
    AWBRecord.find(query)
      .populate(POPULATE_OPTS)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit)),
    AWBRecord.countDocuments(query),
  ]);

  return { records, pagination: buildPagination(page, limit, total) };
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
