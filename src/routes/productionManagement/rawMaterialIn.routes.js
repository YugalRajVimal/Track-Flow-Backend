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
// uploadImage expects the file under field name 'challanPhotoUpload'.

router.post('/', uploadImage, createRawMaterialInController);
router.get('/', fetchRawMaterialInsController);
router.get('/:recordId', fetchRawMaterialInByIdController);
router.put('/:recordId', uploadImage, editRawMaterialInController);
router.delete('/:recordId', deleteRawMaterialInController);

module.exports = router;
