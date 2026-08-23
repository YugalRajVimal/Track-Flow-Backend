// const express = require('express');
// const router = express.Router();

// // Adjust this path if your auth middleware lives elsewhere — this matches
// // the (authenticate, authorize) pair used on the Challan verify-passcode route.
// const { authenticate, authorize } = require('../../middleware/auth');

// const {
//   createCostManagementController,
//   editCostManagementController,
//   fetchCostManagementsController,
//   fetchCostManagementByIdController,
//   deleteCostManagementController,
//   previewStyleAverageController,
//   verifyCostManagementPasscode,
//   verifyCostManagementController,
// } = require('../../controllers/productionManagement/costManagement.controller');

// router.get('/style-average-preview', previewStyleAverageController);

// // Standalone passcode check, same shape as the Challan module's endpoint.
// router.post(
//   '/production/verify-cost-management-passcode',
//   authenticate,
//   authorize('stitching-factory', 'admin'),
//   verifyCostManagementPasscode
// );

// router.post('/', createCostManagementController);
// router.get('/', fetchCostManagementsController);
// router.get('/:recordId', fetchCostManagementByIdController);
// router.put('/:recordId', editCostManagementController);
// router.delete('/:recordId', deleteCostManagementController);

// // Full verify (passcode + sign) — marks the record verified & locks it.
// router.post(
//   '/:recordId/verify',
//   authenticate,
//   authorize('stitching-factory', 'admin'),
//   verifyCostManagementController
// );

// module.exports = router;

const express = require('express');
const router = express.Router();

// Adjust this path if your auth middleware lives elsewhere — this matches
// the (authenticate, authorize) pair used on the Challan verify-passcode route.
const { authenticate, authorize } = require('../../middleware/auth');

const {
  createCostManagementController,
  editCostManagementController,
  fetchCostManagementsController,
  fetchCostManagementByIdController,
  deleteCostManagementController,
  previewStyleAverageController,
  verifyCostManagementPasscode,
  verifyCostManagementController,
} = require('../../controllers/productionManagement/costManagement.controller');

router.get('/style-average-preview', previewStyleAverageController);

// Standalone passcode check, same shape as the Challan module's endpoint.
router.post(
  '/production/verify-cost-management-passcode',
  authenticate,
  authorize('stitching-factory', 'admin'),
  verifyCostManagementPasscode
);

router.post('/', createCostManagementController);
router.get('/', fetchCostManagementsController);
router.get('/:recordId', fetchCostManagementByIdController);

// Edit/Delete are Admin-only.
router.put('/:recordId', authenticate, authorize('admin'), editCostManagementController);
router.delete('/:recordId', authenticate, authorize('admin'), deleteCostManagementController);

// Full verify (passcode + sign) — marks the record verified & locks it.
router.post(
  '/:recordId/verify',
  authenticate,
  authorize('stitching-factory', 'admin'),
  verifyCostManagementController
);

module.exports = router;