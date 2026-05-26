const Brand = require('../models/Brand');
const ChannelPartner = require('../models/ChannelPartner');
const { buildPagination } = require('../utils/response');
const { createAuditLog } = require('../utils/auditLogger');

const getBrands = async ({ page = 1, limit = 10, search = '' }) => {
  const skip = (page - 1) * limit;
  const query = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
    ];
  }

  const [brands, total] = await Promise.all([
    Brand.find(query)
      .populate('channelPartner', 'name code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Brand.countDocuments(query),
  ]);

  return { brands, pagination: buildPagination(page, limit, total) };
};

const getBrandsByChannelPartner = async (channelPartnerId) => {
  const brands = await Brand.find({ channelPartner: channelPartnerId, isActive: true })
    .populate('channelPartner', 'name code')
    .sort({ name: 1 });
  return brands;
};

const createBrand = async (data, actorId, meta) => {
  const cp = await ChannelPartner.findById(data.channelPartner);
  if (!cp) {
    const err = new Error('Channel partner not found');
    err.statusCode = 404;
    throw err;
  }

  const brand = await Brand.create(data);
  await brand.populate('channelPartner', 'name code');

  await createAuditLog({
    actionType: 'create',
    entity: 'Brand',
    entityId: brand._id,
    userId: actorId,
    newData: brand.toObject(),
    ...meta,
  });

  return brand;
};

const updateBrand = async (id, data, actorId, meta) => {
  const brand = await Brand.findById(id);
  if (!brand) {
    const err = new Error('Brand not found');
    err.statusCode = 404;
    throw err;
  }

  if (data.channelPartner) {
    const cp = await ChannelPartner.findById(data.channelPartner);
    if (!cp) {
      const err = new Error('Channel partner not found');
      err.statusCode = 404;
      throw err;
    }
  }

  const oldData = brand.toObject();
  Object.assign(brand, data);
  await brand.save();
  await brand.populate('channelPartner', 'name code');

  await createAuditLog({
    actionType: 'update',
    entity: 'Brand',
    entityId: brand._id,
    userId: actorId,
    oldData,
    newData: brand.toObject(),
    ...meta,
  });

  return brand;
};

const deleteBrand = async (id, actorId, meta) => {
  const brand = await Brand.findById(id);
  if (!brand) {
    const err = new Error('Brand not found');
    err.statusCode = 404;
    throw err;
  }

  await createAuditLog({
    actionType: 'delete',
    entity: 'Brand',
    entityId: brand._id,
    userId: actorId,
    oldData: brand.toObject(),
    ...meta,
  });

  await brand.deleteOne();
};

module.exports = { getBrands, getBrandsByChannelPartner, createBrand, updateBrand, deleteBrand };
