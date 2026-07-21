const express = require('express');
const router = express.Router();

const {
  createColorChemical,
  updateColorChemical,
  getColorChemicals,
  getColorChemicalById,
  removeColorChemical,
} = require('../../controllers/printing/printingColorChemical.controller');
const { uploadImage } = require('../../middleware/imageUploadMiddlware');

// Create a new ColorChemical
router.post('/', uploadImage, createColorChemical);

// Update an existing ColorChemical by ID
router.put('/:id', uploadImage, updateColorChemical);

// Fetch list of ColorChemicals
router.get('/', getColorChemicals);

// Fetch single ColorChemical by ID
router.get('/:id', getColorChemicalById);

// Delete ColorChemical by ID
router.delete('/:id', removeColorChemical);

module.exports = router;