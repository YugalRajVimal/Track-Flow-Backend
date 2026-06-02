const AWBRecord = require('../models/AWBRecord');
const ReturnRecord = require('../models/ReturnRecord');
const AuditLog = require('../models/AuditLog');
const { getTodayRange } = require('../utils/response');

/**
 * Helper — build a { $gte, $lte } createdAt range from optional YYYY-MM-DD
 * strings. Falls back to today when no params supplied.
 */
function buildDateRange(startDate, endDate) {
  if (startDate && endDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return { $gte: start, $lte: end };
  }
  const { start: todayStart, end: todayEnd } = getTodayRange();
  return { $gte: todayStart, $lte: todayEnd };
}

/**
 * Dashboard stats — supports optional filters for channelPartnerId and brandId
 * @param {Object} params 
 * @param {string} [params.startDate]
 * @param {string} [params.endDate]
 * @param {string} [params.channelPartnerId]
 * @param {string} [params.brandId]
 */
const getDashboardStats = async ({ startDate, endDate, channelPartnerId, brandId } = {}) => {
  const createdAt = buildDateRange(startDate, endDate);

  // Build match filters for AWBRecord/ReturnRecord based on channel/brand
  const filters = { createdAt };
  if (channelPartnerId) {
    filters.channelPartner = channelPartnerId;
  }
  if (brandId) {
    filters.brand = brandId;
  }

  // For aggregation (will do similar match object as above):
  const aggMatch = { ...filters };

  // For "total scans", exclude AWBRecords that have status: 'missing'
  const scansFilters = { ...filters, status: { $ne: 'missing' } };

  const [
    totalScansToday,
    totalDispatched,
    totalCancelled,
    brandAnalytics,
    channelPartnerAnalytics,
    scanActivityGraph,
    recentActivities,
    totalReturnRecords,
    awbMissingRecordsCount,
    returnMissingRecordsCount,
  ] = await Promise.all([

    // Total scans in selected range (with channel/brand if supplied)
    // -- exclude 'missing'
    AWBRecord.countDocuments(scansFilters),

    // Total dispatched
    AWBRecord.countDocuments({ ...filters, status: 'dispatched' }),

    // Total cancelled
    AWBRecord.countDocuments({ ...filters, status: 'cancelled' }),

    // Brand analytics (only filter channelPartner if provided)
    AWBRecord.aggregate([
      { $match: aggMatch },
      {
        $group: {
          _id: '$brand',
          // Exclude 'missing' from totalScans
          totalScans: {
            $sum: {
              $cond: [
                { $ne: ['$status', 'missing'] },
                1,
                0,
              ],
            },
          },
          dispatched: {
            $sum: { $cond: [{ $eq: ['$status', 'dispatched'] }, 1, 0] },
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: 'brands',
          localField: '_id',
          foreignField: '_id',
          as: 'brand',
        },
      },
      { $unwind: { path: '$brand', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          brandId: '$_id',
          brandName: '$brand.name',
          brandCode: '$brand.code',
          totalScans: 1,
          dispatched: 1,
          cancelled: 1,
        },
      },
      { $sort: { totalScans: -1 } },
      { $limit: 10 },
    ]),

    // Channel partner analytics (only filter brand if provided)
    AWBRecord.aggregate([
      { $match: aggMatch },
      {
        $group: {
          _id: '$channelPartner',
          // Exclude 'missing' from totalScans
          totalScans: {
            $sum: {
              $cond: [
                { $ne: ['$status', 'missing'] },
                1,
                0,
              ],
            },
          },
          dispatched: {
            $sum: { $cond: [{ $eq: ['$status', 'dispatched'] }, 1, 0] },
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: 'channelpartners',
          localField: '_id',
          foreignField: '_id',
          as: 'channelPartner',
        },
      },
      { $unwind: { path: '$channelPartner', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          channelPartnerId: '$_id',
          channelPartnerName: '$channelPartner.name',
          channelPartnerCode: '$channelPartner.code',
          totalScans: 1,
          dispatched: 1,
          cancelled: 1,
        },
      },
      { $sort: { totalScans: -1 } },
      { $limit: 10 },
    ]),

    // Scan activity graph — daily buckets
    AWBRecord.aggregate([
      { $match: aggMatch },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          // Exclude 'missing' from count
          count: {
            $sum: {
              $cond: [
                { $ne: ['$status', 'missing'] },
                1,
                0,
              ],
            },
          },
          dispatched: {
            $sum: { $cond: [{ $eq: ['$status', 'dispatched'] }, 1, 0] },
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: '$_id',
          count: 1,
          dispatched: 1,
          cancelled: 1,
          _id: 0,
        },
      },
    ]),

    // Recent activities (AuditLogs) are not filtered by channel/brand because
    // an AuditLog may not have a direct reference. Only filter by createdAt.
    AuditLog.find({ createdAt })
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),

    // Return records count (channel/brand filter)
    ReturnRecord.countDocuments(filters),

    // AWB missing records count (with all filters)
    AWBRecord.countDocuments({ ...filters, status: 'missing' }),

    // Return missing records count (with all filters)
    ReturnRecord.countDocuments({ ...filters, status: 'missing' }),
  ]);

  return {
    totalScansToday,      // key name kept for frontend compatibility
    totalDispatched,
    totalCancelled,
    brandAnalytics,
    channelPartnerAnalytics,
    scanActivityGraph,
    recentActivities,
    totalReturnRecords,
    awbMissingRecordsCount,
    returnMissingRecordsCount,
  };
};

module.exports = { getDashboardStats };