const express = require('express');
const router = express.Router();

const {
  createFabricatorRateController,
  updateFabricatorRateController,
  deleteFabricatorRateController,
  fetchFabricatorRatesController,
  fetchFabricatorRateByIdController,
  lookupFabricatorRateController,
} = require('../../controllers/productionManagement/fabricatorRate.controller');

// Direct lookup used by the Submission Management page when assigning pieces.
router.get('/lookup', lookupFabricatorRateController);

router.post('/', createFabricatorRateController);
router.get('/', fetchFabricatorRatesController);
router.get('/:id', fetchFabricatorRateByIdController);
router.put('/:id', updateFabricatorRateController);
router.delete('/:id', deleteFabricatorRateController);

module.exports = router;
