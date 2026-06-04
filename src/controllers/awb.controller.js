const awbService = require('../services/awb.service');
const { sendSuccess } = require('../utils/response');

const getMeta = (req) => ({ ipAddress: req.ip, userAgent: req.get('user-agent') });

const scanAWB = async (req, res, next) => {
  try {
    const { awbId, channelPartnerId, brandId, backDateScan, date  } = req.body;
    const record = await awbService.scanAWB({ awbId, channelPartnerId, brandId, backDateScan, date  }, req.user._id, getMeta(req));
    return sendSuccess(res, 201, 'AWB scanned successfully', record);
  } catch (error) {
    next(error);
  }
};

const cancelAWB = async (req, res, next) => {
  try {
    await awbService.cancelAWB(req.params.awbId, req.user._id, getMeta(req), req.body.passcode);
    return sendSuccess(res, 200, 'AWB marked as cancelled', {});
  } catch (error) {
    next(error);
  }
};

const getAWBs = async (req, res, next) => {
  try {
    // Extract possible missing date range from query
    const { missingFromDate, missingToDate, ...restQuery } = req.query;

    // Call service with full query, including possible missingFromDate/missingToDate
    const { records, pagination } = await awbService.getAWBs({
      ...restQuery,
      ...(missingFromDate && { missingFromDate }),
      ...(missingToDate && { missingToDate }),
    });

    // Enrich each record with missingFromDate and missingToDate from db if present
    const recordsWithMissingDates = records.map(rec => {
      // These will be undefined if not present in DB
      const { missingFromDate, missingToDate } = rec;
      return {
        ...rec._doc ? rec._doc : rec,
        ...(missingFromDate && { missingFromDate }),
        ...(missingToDate && { missingToDate }),
      };
    });

    // Attach missingFromDate/missingToDate back to pagination for reference if they were queried
    if (missingFromDate) pagination.missingFromDate = missingFromDate;
    if (missingToDate) pagination.missingToDate = missingToDate;

    return sendSuccess(res, 200, 'AWB records fetched successfully', recordsWithMissingDates, pagination);
  } catch (error) {
    next(error);
  }
};

const getAWBById = async (req, res, next) => {
  try {
    const record = await awbService.getAWBById(req.params.id);
    return sendSuccess(res, 200, 'AWB record fetched successfully', record);
  } catch (error) {
    next(error);
  }
};

const updateAWB = async (req, res, next) => {
  try {
    const record = await awbService.updateAWB(req.params.id, req.body, req.user._id, getMeta(req));
    return sendSuccess(res, 200, 'AWB record updated successfully', record);
  } catch (error) {
    next(error);
  }
};

const deleteAWB = async (req, res, next) => {
  try {
    await awbService.deleteAWB(req.params.id, req.user._id, getMeta(req));
    return sendSuccess(res, 200, 'AWB record deleted successfully', {});
  } catch (error) {
    next(error);
  }
};

const verifyPasscode = async (req, res, next) => {
  try {
    const { passcode } = req.body;
    const userId = req.user._id;
    const user = await awbService.verifyPasscode(userId, passcode);
    return sendSuccess(res, 200, 'Passcode verified successfully', user);
  } catch (error) {
    next(error);
  }
};

module.exports = { scanAWB, cancelAWB, getAWBs, getAWBById, updateAWB, deleteAWB , verifyPasscode};
