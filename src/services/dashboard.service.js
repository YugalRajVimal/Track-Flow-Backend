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
const OfflineRecord = require('../models/OfflineRecords');

const getDashboardStats = async ({ startDate, endDate, channelPartnerId, brandId } = {}) => {
  // Include all date/brand/channelPartner logic from above, but add offline record count
  const createdAt = buildDateRange(startDate, endDate);

  // --- Original filters, for AWB/Return ---
  const filters = { createdAt };
  if (channelPartnerId) filters.channelPartner = channelPartnerId;
  if (brandId) filters.brand = brandId;

  // --- AWB 'scans' only: status != missing
  const scansFilters = { ...filters, status: { $ne: 'missing' } };

  // For missing status: (date filter on missingFrom/toDate)
  const buildMissingRange = (startDate, endDate) => {
    if (startDate && endDate) {
      const start = new Date(startDate); start.setHours(0,0,0,0);
      const end = new Date(endDate); end.setHours(23,59,59,999);
      return { $gte: start, $lte: end };
    }
    const { start: todayStart, end: todayEnd } = getTodayRange();
    return { $gte: todayStart, $lte: todayEnd };
  };
  const missingDateRange = buildMissingRange(startDate, endDate);

  // AWB/Return "missing" filters
  const awbMissingFilters = {};
  if (channelPartnerId) awbMissingFilters.channelPartner = channelPartnerId;
  if (brandId) awbMissingFilters.brand = brandId;
  awbMissingFilters.status = 'missing';
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

  // --- OfflineRecord FILTERS ---
  // Our offline record schema does not contain brand/channelPartner, only createdAt
  const offlineRecordFilters = { createdAt };

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
    totalOfflineRecords, // <-- count result
  ] = await Promise.all([

    // Total scans (AWB, >= 0, status != missing)
    AWBRecord.countDocuments(scansFilters),

    // Total dispatched
    AWBRecord.countDocuments({ ...filters, status: 'dispatched' }),

    // Total cancelled
    AWBRecord.countDocuments({ ...filters, status: 'cancelled' }),

    // Brand analytics
    AWBRecord.aggregate([
      { $match: filters },
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

    // ChannelPartner analytics
    AWBRecord.aggregate([
      { $match: filters },
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

    // Scan activity graph: group by createdAt day (status != missing)
    AWBRecord.aggregate([
      { $match: filters },
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

    // Recent activities (AuditLogs)
    AuditLog.find({ createdAt })
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),

    // Return records count
    ReturnRecord.countDocuments(filters),

    // AWB missing count
    AWBRecord.countDocuments(awbMissingFilters),

    // Return missing count
    ReturnRecord.countDocuments(returnMissingFilters),

    // Return analytics by channelPartner
    ReturnRecord.aggregate([
      { $match: filters },
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

    // --- ADDED: OfflineRecord count (for given date range) ---
    OfflineRecord.countDocuments(offlineRecordFilters)
  ]);

  return {
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
    totalOfflineRecords, // <-- include in returned stats
  };
};

module.exports = { getDashboardStats };