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

  // General filters (for status !== missing) use createdAt, channelPartnerId, brandId
  const filters = { createdAt };
  if (channelPartnerId) filters.channelPartner = channelPartnerId;
  if (brandId) filters.brand = brandId;

  // For aggregation (same as above)
  const aggMatch = { ...filters };

  // For "total scans", exclude AWBRecords that have status: 'missing'
  const scansFilters = { ...filters, status: { $ne: 'missing' } };

  // Filters for missing status: instead of createdAt, use missingFromDate/missingToDate for date
  const buildMissingRange = (startDate, endDate) => {
    // Both dates required, otherwise skip filtering
    if (startDate && endDate) {
      const start = new Date(startDate); start.setHours(0,0,0,0);
      const end = new Date(endDate); end.setHours(23,59,59,999);
      return { $gte: start, $lte: end };
    }
    const { start: todayStart, end: todayEnd } = getTodayRange();
    return { $gte: todayStart, $lte: todayEnd };
  };
  const missingDateRange = buildMissingRange(startDate, endDate);

  // Build filters for missing AWBs and Returns: date filter applies to missingFromDate/missingToDate
  const awbMissingFilters = {};
  if (channelPartnerId) awbMissingFilters.channelPartner = channelPartnerId;
  if (brandId) awbMissingFilters.brand = brandId;
  awbMissingFilters.status = 'missing';
  // filter: (missingFromDate <= endDate) and (missingToDate >= startDate)
  if (missingDateRange) {
    awbMissingFilters.missingFromDate = { $lte: missingDateRange.$lte };
    awbMissingFilters.missingToDate = { $gte: missingDateRange.$gte };
  }

  const returnMissingFilters = {};
  if (channelPartnerId) returnMissingFilters.channelPartner = channelPartnerId;
  if (brandId) returnMissingFilters.brand = brandId;
  returnMissingFilters.status = 'missing';
  if (missingDateRange) {
    returnMissingFilters.missingFromDate = { $lte: missingDateRange.$lte };
    returnMissingFilters.missingToDate = { $gte: missingDateRange.$gte };
  }

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
    returnAnalytics,
  ] = await Promise.all([

    // Total scans in selected range (with channel/brand if supplied) -
    // excludes 'missing' status
    AWBRecord.countDocuments(scansFilters),

    // Total dispatched (createdAt-based)
    AWBRecord.countDocuments({ ...filters, status: 'dispatched' }),

    // Total cancelled (createdAt-based)
    AWBRecord.countDocuments({ ...filters, status: 'cancelled' }),

    // Brand analytics (createdAt-based)
    AWBRecord.aggregate([
      { $match: aggMatch },
      {
        $group: {
          _id: '$brand',
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

    // Channel partner analytics (createdAt-based)
    AWBRecord.aggregate([
      { $match: aggMatch },
      {
        $group: {
          _id: '$channelPartner',
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

    // Scan activity graph — daily buckets (createdAt-based)
    AWBRecord.aggregate([
      { $match: aggMatch },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
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

    // Recent activities (AuditLogs) — filter only by createdAt
    AuditLog.find({ createdAt })
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),

    // Return records count (createdAt, not missing) 
    ReturnRecord.countDocuments(filters),

    // AWB missing records count (date on missingFrom/ToRange)
    AWBRecord.countDocuments(awbMissingFilters),

    // Return missing records count (date on missingFrom/ToRange)
    ReturnRecord.countDocuments(returnMissingFilters),

    // Return analytics by channelPartner, same structure as channelPartnerAnalytics above
    ReturnRecord.aggregate([
      { $match: aggMatch },
      {
        $group: {
          _id: '$channelPartner',
          totalReturns: {
            $sum: 1,
          },
          missing: {
            $sum: { $cond: [{ $eq: ['$status', 'missing'] }, 1, 0] },
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
          totalReturns: 1,
          missing: 1,
        },
      },
      { $sort: { totalReturns: -1 } },
      { $limit: 10 },
    ]),
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
    returnAnalytics, // new field
  };
};

module.exports = { getDashboardStats };