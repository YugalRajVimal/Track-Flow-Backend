const AuditLog = require('../models/AuditLog');

/**
 * Create an audit log entry
 * @param {Object} options
 * @param {string} options.actionType - create | update | delete | cancel
 * @param {string} options.entity - Model name
 * @param {ObjectId} options.entityId
 * @param {ObjectId} options.userId
 * @param {Object|null} options.oldData
 * @param {Object|null} options.newData
 * @param {string} [options.ipAddress]
 * @param {string} [options.userAgent]
 */
const createAuditLog = async (options) => {
  try {
    await AuditLog.create({
      actionType: options.actionType,
      entity: options.entity,
      entityId: options.entityId,
      user: options.userId,
      oldData: options.oldData || null,
      newData: options.newData || null,
      ipAddress: options.ipAddress || null,
      userAgent: options.userAgent || null,
    });
  } catch (err) {
    // Audit log failure should not break the main flow
    console.error('Audit log error:', err.message);
  }
};

module.exports = { createAuditLog };
