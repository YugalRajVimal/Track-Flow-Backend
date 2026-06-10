const dashboardService = require('../services/dashboard.service');
const { sendSuccess } = require('../utils/response');

const getStats = async (req, res, next) => {
  try {
    // Collect filters from query parameters, supporting all dashboard fields
    const {
      startDate,
      endDate,
      channelPartnerId,
      brandId
    } = req.query;

    // Call the service function with provided filters
    const stats = await dashboardService.getDashboardStats({
      startDate,
      endDate,
      channelPartnerId,
      brandId
    });

    // Return stats in unified success response
    sendSuccess(res, 200, 'Dashboard stats fetched successfully', {
      ...stats,
      // Optionally add a flag or timestamp if useful for consumers
      fetchedAt: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStats };
