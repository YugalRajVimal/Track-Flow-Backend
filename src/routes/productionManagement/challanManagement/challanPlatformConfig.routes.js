const express = require('express');
const router = express.Router();

const {
  createPlatformConfigController,
  updatePlatformConfigController,
  deletePlatformConfigController,
  fetchPlatformConfigsController,
  fetchPlatformConfigByIdController,
} = require('../../../controllers/productionManagement/challanManagement/challanPlatformConfig.controller');

router.post('/', createPlatformConfigController);
router.get('/', fetchPlatformConfigsController);
router.get('/:id', fetchPlatformConfigByIdController);
router.put('/:id', updatePlatformConfigController);
router.delete('/:id', deletePlatformConfigController);

module.exports = router;
