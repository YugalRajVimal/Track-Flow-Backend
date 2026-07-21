const express = require('express');
const router = express.Router();

const {
  getColorChemicalDropdownCtrl,
  addColorChemicalDropdownCtrl,
  editColorChemicalDropdownCtrl,
  removeFromColorChemicalDropdownCtrl,
  deleteColorChemicalDropdownCtrl,
} = require('../../controllers/printing/printingData/colorChemicalData.controller');

// GET the color chemical dropdown entry
router.get('/dropdown', getColorChemicalDropdownCtrl);

// POST to add receiverNames and/or shopNames to the dropdown arrays
router.post('/dropdown/add', addColorChemicalDropdownCtrl);

// PUT to replace arrays in the dropdown entry
router.put('/dropdown/edit', editColorChemicalDropdownCtrl);

// POST to remove receiverNames and/or shopNames from dropdown arrays
router.post('/dropdown/remove', removeFromColorChemicalDropdownCtrl);

// DELETE the entire dropdown document
router.delete('/dropdown/delete', deleteColorChemicalDropdownCtrl);

module.exports = router;