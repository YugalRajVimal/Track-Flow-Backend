const express = require('express');
const router = express.Router();
const taskDataController = require('../controllers/taskData.controller');

// Mount taskDataController on the router
router.use('/', taskDataController);

module.exports = router;