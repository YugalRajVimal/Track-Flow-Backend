const express = require('express');
const router = express.Router();
const offlineDataController = require('../controllers/offlineData.controller');

// Mount offlineDataController on the router

router.use('/', offlineDataController);

module.exports = router;