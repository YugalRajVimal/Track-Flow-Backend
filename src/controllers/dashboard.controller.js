const dashboardService = require('../services/dashboard.service');
const { sendSuccess } = require('../utils/response');

const getStats = async (req, res, next) => {
  try {
    // Accept optional filters for channelPartnerId and brandId in addition to dates
    const { startDate, endDate, channelPartnerId, brandId } = req.query;
    const stats = await dashboardService.getDashboardStats({
      startDate,
      endDate,
      channelPartnerId,
      brandId,
    });
    return sendSuccess(res, 200, 'Dashboard stats fetched successfully', stats);
  } catch (error) {
    next(error);
  }
};

module.exports = { getStats };
