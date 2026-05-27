const AWBRecord = require('../models/AWBRecord');
const { buildPagination, getTodayRange } = require('../utils/response');
const { createAuditLog } = require('../utils/auditLogger');

const POPULATE_OPTS = [
  { path: 'channelPartner', select: 'name code' },
  { path: 'brand', select: 'name code' },
  { path: 'createdBy', select: 'name email' },
];

const scanAWB = async ({ awbId, channelPartnerId, brandId }, userId, meta) => {
  const existing = await AWBRecord.findOne({ awbId });
  if (existing) {
    const err = new Error(`AWB ${awbId} already exists`);
    err.statusCode = 409;
    throw err;
  }

  const record = await AWBRecord.create({
    awbId,
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

const cancelAWB = async (awbId, userId, meta, passcode) => {
  const record = await AWBRecord.findOne({ awbId });
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

  // Fetch the user and verify the passcode
  const user = await User.findById(userId).select('+passcode');
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 403;
    throw err;
  }

  // Defensive: Don't call bcrypt.compare with undefined
  if (!passcode || typeof passcode !== "string") {
    const err = new Error('Passcode must be provided');
    err.statusCode = 400;
    throw err;
  }
  if (!user.passcode) {
    const err = new Error('User has no passcode set');
    err.statusCode = 500;
    throw err;
  }

  let isValidPasscode = false;
  try {
    isValidPasscode = await user.comparePasscode(passcode);
  } catch (e) {
    // Log the error if needed, but respond with invalid passcode
    isValidPasscode = false;
  }

  if (!isValidPasscode) {
    const err = new Error('Invalid passcode');
    err.statusCode = 401;
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
    query.awbId = { $regex: search, $options: 'i' };
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
  if (data.awbId && data.awbId !== record.awbId) {
    const existing = await AWBRecord.findOne({ awbId: data.awbId, _id: { $ne: id } });
    if (existing) {
      const err = new Error(`AWB ID ${data.awbId} already exists`);
      err.statusCode = 409;
      throw err;
    }
  }

  const oldData = record.toObject();
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

  if (search) query.awbId = { $regex: search, $options: 'i' };
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

module.exports = { scanAWB, cancelAWB, getAWBs, getAWBById, updateAWB, deleteAWB, getAWBsForExport };
