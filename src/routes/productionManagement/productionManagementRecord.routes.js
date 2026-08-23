


// const express = require('express');
// const router = express.Router();
 
// const {
//   createBuiltyInController,
//   createReadyFabricController,
//   editTaskController,
//   fetchTasksController,
//   fetchTaskByTaskIdController,
//   fetchPendingVerificationsController,
//   fetchDashboardStatsController,
//   deleteTaskController,
//   verifyBuiltyInController,
//   updateReadyFabricStatusController,
//   fetchReadyFabricDoneController,
//   previewCuttingController,
//   submitCuttingController,
//   fetchFabricatorPoolController,
//   assignFabricatorController,
//   addFabricatorReceivingController,
// } = require('../../controllers/productionManagement/productionManagementRecord.controller');
 
// const { uploadImage, uploadImageFields } = require('../../middleware/imageUploadMiddlware');
// const { authenticate } = require('../../middleware/auth');
// // NOTE: uploadImageFields must accept an array of { name, maxCount } like multer's .fields([...]).
// // If your imageUploadMiddlware only exports a single-file `uploadImage`, add an `uploadImageFields`
// // export there using the same multer storage config, e.g.:
// //   const uploadImageFields = (fields) => upload.fields(fields);
// // and call it below as uploadImageFields([{ name: 'supplierBillPhoto', maxCount: 1 }, ...])
 
// // ─── Page 1: Create ─────────────────────────────────────────────────────────
// router.post(
//   '/builty-in',
//   uploadImageFields([
//     { name: 'supplierBillPhoto', maxCount: 1 },
//     { name: 'dyerReceiverChPhoto', maxCount: 1 },
//   ]),
//   createBuiltyInController
// );
 
// router.post(
//   '/ready-fabric',
//   uploadImageFields([{ name: 'chPhoto', maxCount: 1 }]),
//   createReadyFabricController
// );
 
// // ─── Shared: edit / fetch / delete ──────────────────────────────────────────
// router.put(
//   '/:taskId',
//   uploadImageFields([
//     { name: 'supplierBillPhoto', maxCount: 1 },
//     { name: 'dyerReceiverChPhoto', maxCount: 1 },
//     { name: 'chPhoto', maxCount: 1 },
//   ]),
//   editTaskController
// );
 
// router.get('/', fetchTasksController);
// router.get('/by-task-id', fetchTaskByTaskIdController);
// // NOTE: must be registered before '/:taskId' below, or express will try to
// // treat "pending-verifications" as a taskId param and 404 in fetchByTaskId.
// router.get('/pending-verifications', fetchPendingVerificationsController);
// router.get('/dashboard-stats', fetchDashboardStatsController);
// router.get('/:taskId', fetchTaskByTaskIdController);
// router.delete('/:taskId', deleteTaskController);
 
// // ─── Builty In → Verification (passcode gated) ──────────────────────────────
// router.post('/:taskId/verify-builty-in', authenticate, verifyBuiltyInController);
 
// // ─── Ready Fabric → Done / Returned (passcode gated) ────────────────────────
// router.post('/:taskId/ready-fabric-status', authenticate, updateReadyFabricStatusController);
 
// // ─── Page 2: Cutting ─────────────────────────────────────────────────────────
// router.get('/cutting/ready-fabric-done', fetchReadyFabricDoneController);
// router.get('/:taskId/cutting/preview', previewCuttingController);
// router.post('/:taskId/cutting', uploadImage, submitCuttingController);
 
// // ─── Page 3: Fabricator / Dispatch (multi-fabricator, partial receiving) ───
// router.get('/:taskId/fabricator/pool', fetchFabricatorPoolController);
// router.post('/:taskId/fabricator/assign', uploadImage, assignFabricatorController);
// router.post('/:taskId/fabricator/:fabricatorId/receiving',authenticate, uploadImage, addFabricatorReceivingController);
 
// module.exports = router;
 


const express = require('express');
const router = express.Router();
 
const {
  createBuiltyInController,
  createReadyFabricController,
  editTaskController,
  fetchTasksController,
  fetchTaskByTaskIdController,
  fetchPendingVerificationsController,
  fetchDashboardStatsController,
  deleteTaskController,
  verifyBuiltyInController,
  updateReadyFabricStatusController,
  fetchReadyFabricDoneController,
  previewCuttingController,
  submitCuttingController,
  fetchFabricatorPoolController,
  assignFabricatorController,
  addFabricatorReceivingController,
} = require('../../controllers/productionManagement/productionManagementRecord.controller');
 
const { uploadImage, uploadImageFields } = require('../../middleware/imageUploadMiddlware');
const { authenticate, authorize } = require('../../middleware/auth');
// NOTE: uploadImageFields must accept an array of { name, maxCount } like multer's .fields([...]).
// If your imageUploadMiddlware only exports a single-file `uploadImage`, add an `uploadImageFields`
// export there using the same multer storage config, e.g.:
//   const uploadImageFields = (fields) => upload.fields(fields);
// and call it below as uploadImageFields([{ name: 'supplierBillPhoto', maxCount: 1 }, ...])
 
// ─── Page 1: Create ─────────────────────────────────────────────────────────
router.post(
  '/builty-in',
  uploadImageFields([
    { name: 'supplierBillPhoto', maxCount: 1 },
    { name: 'dyerReceiverChPhoto', maxCount: 1 },
  ]),
  createBuiltyInController
);
 
router.post(
  '/ready-fabric',
  uploadImageFields([{ name: 'chPhoto', maxCount: 1 }]),
  createReadyFabricController
);
 
// ─── Shared: edit / fetch / delete ──────────────────────────────────────────
// Edit and Delete are admin-only actions.
router.put(
  '/:taskId',
  authenticate,
  authorize('admin'),
  uploadImageFields([
    { name: 'supplierBillPhoto', maxCount: 1 },
    { name: 'dyerReceiverChPhoto', maxCount: 1 },
    { name: 'chPhoto', maxCount: 1 },
  ]),
  editTaskController
);
 
router.get('/', fetchTasksController);
router.get('/by-task-id', fetchTaskByTaskIdController);
// NOTE: must be registered before '/:taskId' below, or express will try to
// treat "pending-verifications" as a taskId param and 404 in fetchByTaskId.
router.get('/pending-verifications', fetchPendingVerificationsController);
router.get('/dashboard-stats', fetchDashboardStatsController);
router.get('/:taskId', fetchTaskByTaskIdController);
router.delete('/:taskId', authenticate, authorize('admin'), deleteTaskController);
 
// ─── Builty In → Verification (passcode gated) ──────────────────────────────
router.post('/:taskId/verify-builty-in', authenticate, verifyBuiltyInController);
 
// ─── Ready Fabric → Done / Returned (passcode gated) ────────────────────────
router.post('/:taskId/ready-fabric-status', authenticate, updateReadyFabricStatusController);
 
// ─── Page 2: Cutting ─────────────────────────────────────────────────────────
router.get('/cutting/ready-fabric-done', fetchReadyFabricDoneController);
router.get('/:taskId/cutting/preview', previewCuttingController);
router.post('/:taskId/cutting', uploadImage, submitCuttingController);
 
// ─── Page 3: Fabricator / Dispatch (multi-fabricator, partial receiving) ───
router.get('/:taskId/fabricator/pool', fetchFabricatorPoolController);
router.post('/:taskId/fabricator/assign', uploadImage, assignFabricatorController);
router.post('/:taskId/fabricator/:fabricatorId/receiving',authenticate, uploadImage, addFabricatorReceivingController);
 
module.exports = router;
 
 