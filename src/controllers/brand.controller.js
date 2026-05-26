const brandService = require('../services/brand.service');
const { sendSuccess } = require('../utils/response');

const getMeta = (req) => ({ ipAddress: req.ip, userAgent: req.get('user-agent') });

const getBrands = async (req, res, next) => {
  try {
    const { page, limit, search } = req.query;
    const { brands, pagination } = await brandService.getBrands({ page, limit, search });
    return sendSuccess(res, 200, 'Brands fetched successfully', brands, pagination);
  } catch (error) {
    next(error);
  }
};

const getBrandsByChannelPartner = async (req, res, next) => {
  try {
    const brands = await brandService.getBrandsByChannelPartner(req.params.channelPartnerId);
    return sendSuccess(res, 200, 'Brands fetched successfully', brands);
  } catch (error) {
    next(error);
  }
};

const createBrand = async (req, res, next) => {
  try {
    const brand = await brandService.createBrand(req.body, req.user._id, getMeta(req));
    return sendSuccess(res, 201, 'Brand created successfully', brand);
  } catch (error) {
    next(error);
  }
};

const updateBrand = async (req, res, next) => {
  try {
    const brand = await brandService.updateBrand(req.params.id, req.body, req.user._id, getMeta(req));
    return sendSuccess(res, 200, 'Brand updated successfully', brand);
  } catch (error) {
    next(error);
  }
};

const deleteBrand = async (req, res, next) => {
  try {
    await brandService.deleteBrand(req.params.id, req.user._id, getMeta(req));
    return sendSuccess(res, 200, 'Brand deleted successfully', {});
  } catch (error) {
    next(error);
  }
};

module.exports = { getBrands, getBrandsByChannelPartner, createBrand, updateBrand, deleteBrand };
