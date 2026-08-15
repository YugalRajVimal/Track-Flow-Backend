const express = require('express');
const router = express.Router();

const {
  fetchChallanEntryController,
  saveChallanEntryController,
} = require('../../../controllers/productionManagement/challanManagement/challanEntry.controller');

// :station is 'label' | 'dispatch' | 'return', :date is 'YYYY-MM-DD'
router.get('/:station/:date', fetchChallanEntryController);
router.put('/:station/:date', saveChallanEntryController);

module.exports = router;
