const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/brand.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { createBrandValidator, updateBrandValidator } = require('../validators/brand.validator');
const { validate } = require('../middleware/validate');

router.use(authenticate);

router.get('/', ctrl.getBrands);
router.get('/channel-partner/:channelPartnerId', ctrl.getBrandsByChannelPartner);
router.post(
  '/',
  authorize('admin'),

  createBrandValidator,
 
//   validate,

  ctrl.createBrand
);
router.put('/:id', authorize('admin'), updateBrandValidator, validate, ctrl.updateBrand);
router.delete('/:id', authorize('admin'), ctrl.deleteBrand);

module.exports = router;
