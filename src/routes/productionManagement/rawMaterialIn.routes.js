// const express = require('express');
// const router = express.Router();

// const {
//   createRawMaterialInController,
//   editRawMaterialInController,
//   fetchRawMaterialInsController,
//   fetchRawMaterialInByIdController,
//   deleteRawMaterialInController,
// } = require('../../controllers/productionManagement/rawMaterialIn.controller');

// const { uploadImage } = require('../../middleware/imageUploadMiddlware');
// // uploadImage expects the file under field name 'challanPhotoUpload'.

// router.post('/', uploadImage, createRawMaterialInController);
// router.get('/', fetchRawMaterialInsController);
// router.get('/:recordId', fetchRawMaterialInByIdController);
// router.put('/:recordId', uploadImage, editRawMaterialInController);
// router.delete('/:recordId', deleteRawMaterialInController);

// module.exports = router;


const express = require('express');
const router = express.Router();

const {
  createRawMaterialInController,
  editRawMaterialInController,
  fetchRawMaterialInsController,
  fetchRawMaterialInByIdController,
  deleteRawMaterialInController,
} = require('../../controllers/productionManagement/rawMaterialIn.controller');

const { uploadImage } = require('../../middleware/imageUploadMiddlware');
const { authenticate, authorize } = require('../../middleware/auth');
// uploadImage expects the file under field name 'challanPhotoUpload'.

router.post('/', uploadImage, createRawMaterialInController);
router.get('/', fetchRawMaterialInsController);
router.get('/:recordId', fetchRawMaterialInByIdController);

// Edit/Delete are Admin-only.
router.put('/:recordId', authenticate, authorize('admin'), uploadImage, editRawMaterialInController);
router.delete('/:recordId', authenticate, authorize('admin'), deleteRawMaterialInController);

module.exports = router;