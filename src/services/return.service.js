const ReturnRecord = require('../models/ReturnRecord');
const { buildPagination, getTodayRange } = require('../utils/response');
const { createAuditLog } = require('../utils/auditLogger');

const POPULATE_OPTS = [
  { path: 'channelPartner', select: 'name code' },
  { path: 'brand', select: 'name code' },
  { path: 'createdBy', select: 'name email' },
];

const scanAWB = async ({ awbId, channelPartnerId, brandId, backDateScan, backDate }, userId, meta) => {
  console.log(backDateScan,backDate);
  const awbIdUpper = awbId ? awbId.toUpperCase() : awbId;
  const existing = await ReturnRecord.findOne({ awbId: awbIdUpper });
  if (existing) {
    const err = new Error(`AWB ${awbIdUpper} already exists`);
    err.statusCode = 409;
    throw err;
  }

  let scannedAtValue = new Date();
  console.log(backDateScan,backDate)
  if (backDateScan && backDate) {
    scannedAtValue = new Date(backDate);
    // Defensive: If invalid date string, fallback to now
    if (isNaN(scannedAtValue.getTime())) scannedAtValue = new Date();
  }
  console.log(scannedAtValue);

  const record = await ReturnRecord.create({
    awbId: awbIdUpper,
    channelPartner: channelPartnerId,
    brand: brandId,
    status: '-',
    scannedAt: scannedAtValue,
    createdBy: userId,
  });

  await record.populate(POPULATE_OPTS);

  await createAuditLog({
    actionType: 'create',
    entity: 'ReturnRecord',
    entityId: record._id,
    userId,
    newData: { awbId: record.awbId, status: record.status },
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

  // Build base filter for shared fields
  const baseFilter = {};
  if (search) {
    baseFilter.awbId = { $regex: search.trim().toUpperCase(), $options: 'i' };
  }
  if (channelPartnerId) {
    baseFilter.channelPartner = channelPartnerId;
  }
  if (brandId) {
    baseFilter.brand = brandId;
  }

  // Date range selection
  let start, end;
  if (startDate || endDate) {
    start = startDate ? new Date(startDate) : undefined;
    end = endDate ? new Date(endDate) : undefined;
    if (end) end.setHours(23, 59, 59, 999);
  } else {
    const today = getTodayRange();
    start = today.start;
    end = today.end;
  }

  let mongoFilter;

  if (status === 'missing') {
    // Only show status missing with missingFromDate/missingToDate match (if date filter present)
    mongoFilter = { ...baseFilter, status: 'missing' };
    if (start || end) {
      if (start && end) {
        mongoFilter.missingFromDate = { $lte: end };
        mongoFilter.missingToDate = { $gte: start };
      } else if (start) {
        mongoFilter.missingToDate = { $gte: start };
      } else if (end) {
        mongoFilter.missingFromDate = { $lte: end };
      }
    }
  } else if (status && status !== 'missing') {
    // normal records only with explicit status (should only allow '-')
    mongoFilter = { ...baseFilter, status };
    if (start || end) {
      mongoFilter.scannedAt = {};
      if (start) mongoFilter.scannedAt.$gte = start;
      if (end) mongoFilter.scannedAt.$lte = end;
      if (!Object.keys(mongoFilter.scannedAt).length) delete mongoFilter.scannedAt;
    }
  } else {
    // No status: show both missing and normal within rules.
    const $or = [];
    // 1. Normal, not missing
    const normal = { ...baseFilter, status: { $ne: 'missing' } };
    if (start || end) {
      normal.scannedAt = {};
      if (start) normal.scannedAt.$gte = start;
      if (end) normal.scannedAt.$lte = end;
      if (!Object.keys(normal.scannedAt).length) delete normal.scannedAt;
    }
    $or.push(normal);
    // 2. Missing
    const missing = { ...baseFilter, status: 'missing' };
    if (start || end) {
      if (start && end) {
        missing.missingFromDate = { $lte: end };
        missing.missingToDate = { $gte: start };
      } else if (start) {
        missing.missingToDate = { $gte: start };
      } else if (end) {
        missing.missingFromDate = { $lte: end };
      }
    }
    $or.push(missing);

    mongoFilter = { $or };
  }

  const sortDir = sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortBy]: sortDir };

  const [records, total] = await Promise.all([
    ReturnRecord.find(mongoFilter)
      .populate(POPULATE_OPTS)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit)),
    ReturnRecord.countDocuments(mongoFilter),
  ]);

  return { records, pagination: buildPagination(page, limit, total) };
};

const getAWBById = async (id) => {
  const record = await ReturnRecord.findById(id).populate(POPULATE_OPTS);
  if (!record) {
    const err = new Error('AWB record not found');
    err.statusCode = 404;
    throw err;
  }
  return record;
};

const updateAWB = async (id, data, userId, meta) => {
  const record = await ReturnRecord.findById(id);
  if (!record) {
    const err = new Error('AWB record not found');
    err.statusCode = 404;
    throw err;
  }

  // If updating awbId, check uniqueness
  let newAwbIdUpper = undefined;
  if (data.awbId && data.awbId !== record.awbId) {
    newAwbIdUpper = data.awbId.toUpperCase();
    const existing = await ReturnRecord.findOne({ awbId: newAwbIdUpper, _id: { $ne: id } });
    if (existing) {
      const err = new Error(`AWB ID ${newAwbIdUpper} already exists`);
      err.statusCode = 409;
      throw err;
    }
  }

  const oldData = record.toObject();
  Object.assign(record, {
    ...data,
    ...(data.awbId ? { awbId: (data.awbId || '').toUpperCase() } : {}),
  });
  await record.save();
  await record.populate(POPULATE_OPTS);

  await createAuditLog({
    actionType: 'update',
    entity: 'ReturnRecord',
    entityId: record._id,
    userId,
    oldData,
    newData: record.toObject(),
    ...meta,
  });

  return record;
};

const deleteAWB = async (id, userId, meta) => {
  const record = await ReturnRecord.findById(id);
  if (!record) {
    const err = new Error('AWB record not found');
    err.statusCode = 404;
    throw err;
  }

  await createAuditLog({
    actionType: 'delete',
    entity: 'ReturnRecord',
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

  return ReturnRecord.find(query)
    .populate([
      { path: 'channelPartner', select: 'name code' },
      { path: 'brand', select: 'name code' },
      { path: 'createdBy', select: 'name email' },
    ])
    .sort({ [sortBy]: sortDir });
};

module.exports = { scanAWB, getAWBs, getAWBById, updateAWB, deleteAWB, getAWBsForExport };
