const cpService = require('../services/channelPartner.service');
const { sendSuccess } = require('../utils/response');

const getMeta = (req) => ({ ipAddress: req.ip, userAgent: req.get('user-agent') });

const getChannelPartners = async (req, res, next) => {
  try {
    const { page, limit, search } = req.query;
    const { channelPartners, pagination } = await cpService.getChannelPartners({ page, limit, search });
    return sendSuccess(res, 200, 'Channel partners fetched successfully', channelPartners, pagination);
  } catch (error) {
    next(error);
  }
};

const createChannelPartner = async (req, res, next) => {
  try {
    const cp = await cpService.createChannelPartner(req.body, req.user._id, getMeta(req));
    return sendSuccess(res, 201, 'Channel partner created successfully', cp);
  } catch (error) {
    next(error);
  }
};

const updateChannelPartner = async (req, res, next) => {
  try {
    const cp = await cpService.updateChannelPartner(req.params.id, req.body, req.user._id, getMeta(req));
    return sendSuccess(res, 200, 'Channel partner updated successfully', cp);
  } catch (error) {
    next(error);
  }
};

const deleteChannelPartner = async (req, res, next) => {
  try {
    await cpService.deleteChannelPartner(req.params.id, req.user._id, getMeta(req));
    return sendSuccess(res, 200, 'Channel partner deleted successfully', {});
  } catch (error) {
    next(error);
  }
};

module.exports = { getChannelPartners, createChannelPartner, updateChannelPartner, deleteChannelPartner };
