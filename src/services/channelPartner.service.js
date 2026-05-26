const ChannelPartner = require('../models/ChannelPartner');
const { buildPagination } = require('../utils/response');
const { createAuditLog } = require('../utils/auditLogger');

const getChannelPartners = async ({ page = 1, limit = 10, search = '' }) => {
  const skip = (page - 1) * limit;
  const query = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
    ];
  }

  const [channelPartners, total] = await Promise.all([
    ChannelPartner.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    ChannelPartner.countDocuments(query),
  ]);

  return { channelPartners, pagination: buildPagination(page, limit, total) };
};

const createChannelPartner = async (data, actorId, meta) => {
  const existing = await ChannelPartner.findOne({ code: data.code.toUpperCase() });
  if (existing) {
    const err = new Error('Channel partner with this code already exists');
    err.statusCode = 409;
    throw err;
  }

  const cp = await ChannelPartner.create(data);
  await createAuditLog({
    actionType: 'create',
    entity: 'ChannelPartner',
    entityId: cp._id,
    userId: actorId,
    newData: cp.toObject(),
    ...meta,
  });
  return cp;
};

const updateChannelPartner = async (id, data, actorId, meta) => {
  const cp = await ChannelPartner.findById(id);
  if (!cp) {
    const err = new Error('Channel partner not found');
    err.statusCode = 404;
    throw err;
  }

  const oldData = cp.toObject();
  Object.assign(cp, data);
  await cp.save();

  await createAuditLog({
    actionType: 'update',
    entity: 'ChannelPartner',
    entityId: cp._id,
    userId: actorId,
    oldData,
    newData: cp.toObject(),
    ...meta,
  });

  return cp;
};

const deleteChannelPartner = async (id, actorId, meta) => {
  const cp = await ChannelPartner.findById(id);
  if (!cp) {
    const err = new Error('Channel partner not found');
    err.statusCode = 404;
    throw err;
  }

  await createAuditLog({
    actionType: 'delete',
    entity: 'ChannelPartner',
    entityId: cp._id,
    userId: actorId,
    oldData: cp.toObject(),
    ...meta,
  });

  await cp.deleteOne();
};

module.exports = { getChannelPartners, createChannelPartner, updateChannelPartner, deleteChannelPartner };
