const express = require('express');
const router = express.Router();
const productionManagementDataController = require('../../controllers/productionManagement/productionManagementData.controller');


// Mount taskDataController on the router
router.use('/', productionManagementDataController);




module.exports = router;