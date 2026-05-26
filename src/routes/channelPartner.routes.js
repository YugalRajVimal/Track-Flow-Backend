const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/channelPartner.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { createChannelPartnerValidator, updateChannelPartnerValidator } = require('../validators/channelPartner.validator');
const { validate } = require('../middleware/validate');

router.use(authenticate);

router.get('/', ctrl.getChannelPartners);
router.post('/', authorize('admin'), createChannelPartnerValidator, validate, ctrl.createChannelPartner);
router.put('/:id', authorize('admin'), updateChannelPartnerValidator, validate, ctrl.updateChannelPartner);
router.delete('/:id', authorize('admin'), ctrl.deleteChannelPartner);

module.exports = router;
