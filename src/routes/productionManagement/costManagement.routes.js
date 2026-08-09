const express = require('express');
const router = express.Router();

const {
  createCostManagementController,
  editCostManagementController,
  fetchCostManagementsController,
  fetchCostManagementByIdController,
  deleteCostManagementController,
  previewStyleAverageController,
} = require('../../controllers/productionManagement/costManagement.controller');

router.get('/style-average-preview', previewStyleAverageController);

router.post('/', createCostManagementController);
router.get('/', fetchCostManagementsController);
router.get('/:recordId', fetchCostManagementByIdController);
router.put('/:recordId', editCostManagementController);
router.delete('/:recordId', deleteCostManagementController);

module.exports = router;
