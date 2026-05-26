const auditLogService = require('../services/auditLog.service');
const { sendSuccess } = require('../utils/response');

const getAuditLogs = async (req, res, next) => {
  try {
    const { logs, pagination } = await auditLogService.getAuditLogs(req.query);
    return sendSuccess(res, 200, 'Audit logs fetched successfully', logs, pagination);
  } catch (error) {
    next(error);
  }
};

module.exports = { getAuditLogs };
