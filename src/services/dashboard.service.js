const AWBRecord = require('../models/AWBRecord');
const AuditLog = require('../models/AuditLog');
const { getTodayRange } = require('../utils/response');

const getDashboardStats = async () => {
  const { start: todayStart, end: todayEnd } = getTodayRange();

  const [
    totalScansToday,
    totalDispatched,
    totalCancelled,
    brandAnalytics,
    channelPartnerAnalytics,
    scanActivityGraph,
    recentActivities,
  ] = await Promise.all([
    // Total scans today
    AWBRecord.countDocuments({
      createdAt: { $gte: todayStart, $lte: todayEnd },
    }),

    // Total dispatched (all time)
    AWBRecord.countDocuments({ status: 'dispatched' }),

    // Total cancelled (all time)
    AWBRecord.countDocuments({ status: 'cancelled' }),

    // Brand analytics
    AWBRecord.aggregate([
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
      // Fix: use correct unwind option for broad MongoDB compatibility
      // { $unwind: { path: '$brand', preserveNullAndEmpty: true } },
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

    // Channel partner analytics
    AWBRecord.aggregate([
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
      // Fix: use correct unwind option for broad MongoDB compatibility
      // { $unwind: { path: '$channelPartner', preserveNullAndEmpty: true } },
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

    // Scan activity graph — last 7 days
    AWBRecord.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      },
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

    // Recent activities from audit logs
    AuditLog.find()
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
  ]);

  return {
    totalScansToday,
    totalDispatched,
    totalCancelled,
    brandAnalytics,
    channelPartnerAnalytics,
    scanActivityGraph,
    recentActivities,
  };
};

module.exports = { getDashboardStats };
