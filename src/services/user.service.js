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

  // Accept and persist paymentDepartmentPasscode and verificationPassscode if provided
  const user = await User.create(data);
  await createAuditLog({
    actionType: 'create',
    entity: 'User',
    entityId: user._id,
    userId: actorId,
    newData: { 
      name: user.name, 
      email: user.email, 
      role: user.role, 
      passcode: user.passcode, // include passcode for logging
      paymentDepartmentPasscode: user.paymentDepartmentPasscode, // log paymentDepartmentPasscode
      verificationPassscode: user.verificationPassscode // log verificationPassscode
    },
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

  const oldData = { 
    name: user.name, 
    email: user.email, 
    role: user.role,
    passcode: user.passcode, // include passcode in old data
    paymentDepartmentPasscode: user.paymentDepartmentPasscode, // log old paymentDepartmentPasscode
    verificationPassscode: user.verificationPassscode // log old verificationPassscode
  };

  if (data.email && data.email !== user.email) {
    const existing = await User.findOne({ email: data.email, _id: { $ne: id } });
    if (existing) {
      const err = new Error('Email already exists');
      err.statusCode = 409;
      throw err;
    }
  }

  // Only update passcode if it's present in the data
  if (Object.prototype.hasOwnProperty.call(data, 'passcode')) {
    user.passcode = data.passcode;
  }

  // Only update paymentDepartmentPasscode if it's present in the data
  if (Object.prototype.hasOwnProperty.call(data, 'paymentDepartmentPasscode')) {
    user.paymentDepartmentPasscode = data.paymentDepartmentPasscode;
  }

  // Only update verificationPassscode if it's present in the data
  if (Object.prototype.hasOwnProperty.call(data, 'verificationPassscode')) {
    user.verificationPassscode = data.verificationPassscode;
  }

  // Update other fields (excluding passcode, paymentDepartmentPasscode, and verificationPassscode)
  Object.keys(data).forEach(key => {
    if (key !== 'passcode' && key !== 'paymentDepartmentPasscode' && key !== 'verificationPassscode') {
      user[key] = data[key];
    }
  });

  await user.save();

  await createAuditLog({
    actionType: 'update',
    entity: 'User',
    entityId: user._id,
    userId: actorId,
    oldData,
    newData: { 
      name: user.name, 
      email: user.email, 
      role: user.role,
      passcode: user.passcode, // include passcode in new data
      paymentDepartmentPasscode: user.paymentDepartmentPasscode, // log new paymentDepartmentPasscode
      verificationPassscode: user.verificationPassscode // log new verificationPassscode
    },
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
    oldData: { 
      name: user.name, 
      email: user.email, 
      role: user.role,
      paymentDepartmentPasscode: user.paymentDepartmentPasscode, // add for delete logs
      verificationPassscode: user.verificationPassscode // add for delete logs
    },
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



/**
 * Verifies whether the provided payment department passcode matches the user's passcode hash.
 * Returns the user object if matched, otherwise throws an error.
 * @param {Object} userParam - The user object (typically from req.user)
 * @param {string} paymentDepartmentPasscode - The passcode to verify (plaintext)
 * @returns {Promise<User>} - Resolves with user if valid, else throws Error.
 */
const verifyPaymentDepartmentPasscode = async (userParam, paymentDepartmentPasscode) => {
  if (!paymentDepartmentPasscode || typeof paymentDepartmentPasscode !== 'string') {
    const err = new Error('Payment department passcode is required');
    err.statusCode = 400;
    throw err;
  }

  // Fetch the user from DB using the ID from the user parameter, selecting paymentDepartmentPasscode for comparison
  const dbUser = await User.findById(userParam._id).select('+paymentDepartmentPasscode');
  if (!dbUser) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  // Compare using the model's comparePaymentDepartmentPasscode method (supports hashed passcodes)
  const isValid = await dbUser.comparePaymentDepartmentPasscode(paymentDepartmentPasscode.trim());
  if (!isValid) {
    const err = new Error('Invalid payment department passcode');
    err.statusCode = 401;
    throw err;
  }
  return dbUser;
};

/**
 * Verifies whether the provided verification passcode matches the user's hashed verificationPassscode.
 * Returns the user object if matched, otherwise throws an error.
 * @param {Object} userParam - The user object (typically from req.user)
 * @param {string} verificationPasscode - The passcode to verify (plaintext)
 * @returns {Promise<User>} - Resolves with user if valid, else throws Error.
 */
const verifyVerificationPasscode = async (userParam, verificationPasscode) => {
  if (!verificationPasscode || typeof verificationPasscode !== 'string') {
    const err = new Error('Verification passcode is required');
    err.statusCode = 400;
    throw err;
  }

  // Fetch the user from DB using the ID from the user parameter, selecting verificationPassscode for comparison
  const dbUser = await User.findById(userParam._id).select('+verificationPassscode');
  if (!dbUser) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  // Compare using the model's compareVerificationPassscode method (supports hashed passcodes)
  if (typeof dbUser.compareVerificationPassscode !== 'function') {
    // Safeguard if the method is not implemented
    const err = new Error('Verification method not implemented on User model');
    err.statusCode = 500;
    throw err;
  }

  const isValid = await dbUser.compareVerificationPassscode(verificationPasscode.trim());
  if (!isValid) {
    const err = new Error('Invalid verification passcode');
    err.statusCode = 401;
    throw err;
  }
  return dbUser;
};



/**
 * Verifies whether the given userId and passcode match a user.
 * Returns the user object if matched, otherwise throws an error.
 * @param {string} userId - The user ID to verify.
 * @param {string} passcode - The passcode to verify.
 * @returns {Promise<User>} - Resolves with user if valid, else throws Error.
 */

module.exports = { getUsers, createUser, updateUser, deleteUser, updateUserStatus, verifyPaymentDepartmentPasscode, verifyVerificationPasscode };
