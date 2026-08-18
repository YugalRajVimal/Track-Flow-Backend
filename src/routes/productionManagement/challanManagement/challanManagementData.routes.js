const express = require('express');
const router = express.Router();
const challanManagementDataController = require('../../../controllers/productionManagement/challanManagement/challanManagementData.controller');

// Mount challanManagementDataController on the router
router.use('/', challanManagementDataController);

module.exports = router;