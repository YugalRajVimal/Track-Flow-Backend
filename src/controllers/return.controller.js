const returnService = require('../services/return.service');
const { sendSuccess } = require('../utils/response');

const getMeta = (req) => ({ ipAddress: req.ip, userAgent: req.get('user-agent') });

const scanAWB = async (req, res, next) => {
  try {
    const { awbId, channelPartnerId, brandId } = req.body;
    const record = await returnService.scanAWB({ awbId, channelPartnerId, brandId }, req.user._id, getMeta(req));
    return sendSuccess(res, 201, 'AWB scanned successfully', record);
  } catch (error) {
    next(error);
  }
};

const getAWBs = async (req, res, next) => {
  try {
    const { records, pagination } = await returnService.getAWBs(req.query);
    
    return sendSuccess(res, 200, 'AWB records fetched successfully', records, pagination);
  } catch (error) {
    next(error);
  }
};

const getAWBById = async (req, res, next) => {
  try {
    const record = await returnService.getAWBById(req.params.id);
    return sendSuccess(res, 200, 'AWB record fetched successfully', record);
  } catch (error) {
    next(error);
  }
};

const updateAWB = async (req, res, next) => {
  try {
    const record = await returnService.updateAWB(req.params.id, req.body, req.user._id, getMeta(req));
    return sendSuccess(res, 200, 'AWB record updated successfully', record);
  } catch (error) {
    next(error);
  }
};

const deleteAWB = async (req, res, next) => {
  try {
    await returnService.deleteAWB(req.params.id, req.user._id, getMeta(req));
    return sendSuccess(res, 200, 'AWB record deleted successfully', {});
  } catch (error) {
    next(error);
  }
};


module.exports = { scanAWB, getAWBs, getAWBById, updateAWB, deleteAWB };
