const ReturnRecord = require('../models/ReturnRecord');
const { buildPagination, getTodayRange } = require('../utils/response');
const { createAuditLog } = require('../utils/auditLogger');

const POPULATE_OPTS = [
  { path: 'channelPartner', select: 'name code' },
  { path: 'brand', select: 'name code' },
  { path: 'createdBy', select: 'name email' },
];

const scanAWB = async ({ awbId, channelPartnerId, brandId }, userId, meta) => {
  const awbIdUpper = awbId ? awbId.toUpperCase() : awbId;
  const existing = await ReturnRecord.findOne({ awbId: awbIdUpper });
  if (existing) {
    const err = new Error(`AWB ${awbIdUpper} already exists`);
    err.statusCode = 409;
    throw err;
  }

  const record = await ReturnRecord.create({
    awbId: awbIdUpper,
    channelPartner: channelPartnerId,
    brand: brandId,
    status: '-',
    scannedAt: new Date(),
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
    sortBy = 'createdAt',
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
    normalQuery.createdAt = {};
    if (start) normalQuery.createdAt.$gte = start;
    if (end) normalQuery.createdAt.$lte = end;
    // Remove empty createdAt object if no bounds
    if (Object.keys(normalQuery.createdAt).length === 0) delete normalQuery.createdAt;
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
        query.createdAt = {};
        if (start) query.createdAt.$gte = start;
        if (end) query.createdAt.$lte = end;
        if (Object.keys(query.createdAt).length === 0) delete query.createdAt;
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
      ReturnRecord.find(q)
        .populate(POPULATE_OPTS)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      ReturnRecord.countDocuments(q),
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
      ReturnRecord.find(orQuery)
        .populate(POPULATE_OPTS)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      ReturnRecord.countDocuments(orQuery),
    ]);
    return { records, pagination: buildPagination(page, limit, total) };
  }
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
