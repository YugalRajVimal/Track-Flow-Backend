const {
  getColorChemicalDropdown,
  addToColorChemicalDropdown,
  editColorChemicalDropdownArrays,
  removeFromColorChemicalDropdown,
  deleteColorChemicalDropdown,
} = require('../services/colorChemicalData.service');

// Get (single) color chemical dropdown entry
async function getColorChemicalDropdownCtrl(req, res) {
  try {
    const dropdown = await getColorChemicalDropdown();
    res.status(200).json({ success: true, data: dropdown });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// Add receiverNames and/or shopNames to the dropdown arrays
async function addColorChemicalDropdownCtrl(req, res) {
  try {
    const { receiverNames = [], shopNames = [] } = req.body;
    const updated = await addToColorChemicalDropdown({ receiverNames, shopNames });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

// Edit (replace) arrays in the dropdown entry
async function editColorChemicalDropdownCtrl(req, res) {
  try {
    const { receiverNames, shopNames } = req.body;
    const updated = await editColorChemicalDropdownArrays({ receiverNames, shopNames });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

// Remove receiverNames and/or shopNames from the dropdown arrays
async function removeFromColorChemicalDropdownCtrl(req, res) {
  try {
    const { receiverNames = [], shopNames = [] } = req.body;
    const updated = await removeFromColorChemicalDropdown({ receiverNames, shopNames });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

// Delete the entire dropdown document (should be rarely called)
async function deleteColorChemicalDropdownCtrl(req, res) {
  try {
    const deleted = await deleteColorChemicalDropdown();
    res.status(200).json({ success: true, data: deleted });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
}

module.exports = {
  getColorChemicalDropdownCtrl,
  addColorChemicalDropdownCtrl,
  editColorChemicalDropdownCtrl,
  removeFromColorChemicalDropdownCtrl,
  deleteColorChemicalDropdownCtrl,
};