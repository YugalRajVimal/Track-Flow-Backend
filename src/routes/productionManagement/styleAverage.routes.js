const express = require('express');
const router = express.Router();

const {
  createStyleAverageController,
  updateStyleAverageController,
  deleteStyleAverageController,
  fetchStyleAveragesController,
  fetchStyleAverageByIdController,
  lookupStyleAverageController,
} = require('../../controllers/productionManagement/styleAverage.controller');

// Direct lookup used by the Cutting page while building expected-pieces preview.
router.get('/lookup', lookupStyleAverageController);

router.post('/', createStyleAverageController);
router.get('/', fetchStyleAveragesController);
router.get('/:id', fetchStyleAverageByIdController);
router.put('/:id', updateStyleAverageController);
router.delete('/:id', deleteStyleAverageController);

module.exports = router;
