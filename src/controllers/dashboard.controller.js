const dashboardService = require('../services/dashboard.service');
const { sendSuccess } = require('../utils/response');

const getStats = async (req, res, next) => {
  try {
    const stats = await dashboardService.getDashboardStats();
    return sendSuccess(res, 200, 'Dashboard stats fetched successfully', stats);
  } catch (error) {
    next(error);
  }
};

module.exports = { getStats };
