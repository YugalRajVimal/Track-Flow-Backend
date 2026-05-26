const express = require('express');
const router = express.Router();
const { exportAWBCSV } = require('../controllers/export.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/awb-csv', exportAWBCSV);

module.exports = router;
