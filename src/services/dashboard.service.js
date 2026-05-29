const AWBRecord = require('../models/AWBRecord');
const ReturnRecord = require('../models/ReturnRecord');
const AuditLog = require('../models/AuditLog');
const { getTodayRange } = require('../utils/response');

// ─────────────────────────────────────────────────────────────────────────────
// Helper — build a { $gte, $lte } createdAt range from optional YYYY-MM-DD
// strings. Falls back to today when no params supplied (preserves old behaviour).
// ─────────────────────────────────────────────────────────────────────────────
function buildDateRange(startDate, endDate) {
  if (startDate && endDate) {
    // Parse as local midnight → end-of-day so the full day is always included
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return { $gte: start, $lte: end };
  }

  // Default: today (original behaviour)
  const { start: todayStart, end: todayEnd } = getTodayRange();
  return { $gte: todayStart, $lte: todayEnd };
}


const getDashboardStats = async ({ startDate, endDate } = {}) => {
  const createdAt = buildDateRange(startDate, endDate);

  // Single match object reused across every query
  const dateMatch = { createdAt };

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

    // ── Total scans in selected range ──────────────────────────────────────
    AWBRecord.countDocuments(dateMatch),

    // ── Total dispatched in selected range ─────────────────────────────────
    AWBRecord.countDocuments({ ...dateMatch, status: 'dispatched' }),

    // ── Total cancelled in selected range ──────────────────────────────────
    AWBRecord.countDocuments({ ...dateMatch, status: 'cancelled' }),

    // ── Brand analytics filtered by date range ─────────────────────────────
    AWBRecord.aggregate([
      { $match: dateMatch },
      {
        $group: {
          _id: '$brand',
          totalScans: { $sum: 1 },
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

    // ── Channel partner analytics filtered by date range ───────────────────
    AWBRecord.aggregate([
      { $match: dateMatch },
      {
        $group: {
          _id: '$channelPartner',
          totalScans: { $sum: 1 },
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

    // ── Scan activity graph — daily buckets within selected range ──────────
    // Previously hardcoded to "last 7 days"; now reflects the chosen range.
    AWBRecord.aggregate([
      { $match: dateMatch },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
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

    // ── Recent activities filtered by date range ───────────────────────────
    AuditLog.find({ createdAt })
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),

    // ── Return records count filtered by date range ────────────────────────
    ReturnRecord.countDocuments(dateMatch),

    // ── AWB Missing Records count filtered by date range/status ────────────
    AWBRecord.countDocuments({ ...dateMatch, status: 'missing' }),

    // ── ReturnRecord Missing Records count filtered by date range/status ───
    ReturnRecord.countDocuments({ ...dateMatch, status: 'missing' }),
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