const User = require('../models/User');
const { buildPagination } = require('../utils/response');
const { createAuditLog } = require('../utils/auditLogger');

const getUsers = async ({ page = 1, limit = 10, search = '' }) => {
  const skip = (page - 1) * limit;
  const query = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    User.countDocuments(query),
  ]);

  return { users, pagination: buildPagination(page, limit, total) };
};

const createUser = async (data, actorId, meta) => {
  const existing = await User.findOne({ email: data.email });
  if (existing) {
    const err = new Error('Email already exists');
    err.statusCode = 409;
    throw err;
  }

  const user = await User.create(data);
  await createAuditLog({
    actionType: 'create',
    entity: 'User',
    entityId: user._id,
    userId: actorId,
    newData: { name: user.name, email: user.email, role: user.role },
    ...meta,
  });
  return user;
};

const updateUser = async (id, data, actorId, meta) => {
  const user = await User.findById(id);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const oldData = { name: user.name, email: user.email, role: user.role };

  if (data.email && data.email !== user.email) {
    const existing = await User.findOne({ email: data.email, _id: { $ne: id } });
    if (existing) {
      const err = new Error('Email already exists');
      err.statusCode = 409;
      throw err;
    }
  }

  Object.assign(user, data);
  await user.save();

  await createAuditLog({
    actionType: 'update',
    entity: 'User',
    entityId: user._id,
    userId: actorId,
    oldData,
    newData: { name: user.name, email: user.email, role: user.role },
    ...meta,
  });

  return user;
};

const deleteUser = async (id, actorId, meta) => {
  const user = await User.findById(id);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  await createAuditLog({
    actionType: 'delete',
    entity: 'User',
    entityId: user._id,
    userId: actorId,
    oldData: { name: user.name, email: user.email, role: user.role },
    ...meta,
  });

  await user.deleteOne();
};

const updateUserStatus = async (id, isActive, actorId, meta) => {
  const user = await User.findById(id);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const oldData = { isActive: user.isActive };
  user.isActive = isActive;
  await user.save();

  await createAuditLog({
    actionType: 'update',
    entity: 'User',
    entityId: user._id,
    userId: actorId,
    oldData,
    newData: { isActive: user.isActive },
    ...meta,
  });

  return user;
};

module.exports = { getUsers, createUser, updateUser, deleteUser, updateUserStatus };
