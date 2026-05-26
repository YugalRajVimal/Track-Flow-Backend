const AuditLog = require('../models/AuditLog');
const { buildPagination } = require('../utils/response');

const getAuditLogs = async (filters) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    actionType = '',
    userId = '',
    startDate = '',
    endDate = '',
  } = filters;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const query = {};

  if (actionType) {
    query.actionType = actionType;
  }

  if (userId) {
    query.user = userId;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  if (search) {
    query.$or = [
      { entity: { $regex: search, $options: 'i' } },
    ];
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    AuditLog.countDocuments(query),
  ]);

  return { logs, pagination: buildPagination(page, limit, total) };
};

module.exports = { getAuditLogs };
