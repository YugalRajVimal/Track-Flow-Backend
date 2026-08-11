const express = require('express');
const router = express.Router();

const {
  createJobRateController,
  updateJobRateController,
  deleteJobRateController,
  fetchJobRatesController,
  fetchJobRateByIdController,
  lookupJobRateController,
} = require('../../controllers/productionManagement/jobRate.controller');

// Direct lookup used by the Cutting page while building expected-pieces preview.
router.get('/lookup', lookupJobRateController);

router.post('/', createJobRateController);
router.get('/', fetchJobRatesController);
router.get('/:id', fetchJobRateByIdController);
router.put('/:id', updateJobRateController);
router.delete('/:id', deleteJobRateController);

module.exports = router;
