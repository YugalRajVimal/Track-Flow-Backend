const express = require('express');
const router = express.Router();
const { exportAWBCSV,exportReturnCSV } = require('../controllers/export.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/awb-csv', exportAWBCSV);
router.get('/return-csv', exportReturnCSV);


module.exports = router;
