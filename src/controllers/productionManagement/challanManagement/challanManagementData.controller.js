const express = require('express');
const router = express.Router();
const {
  getChallanManagementDropdownValues,
  createChallanManagementDropdown,
  updateChallanManagementDropdown,
  deleteChallanManagementDropdown,
  getChallanManagementDropdownById,
} = require('../../../services/productionManagement/challanManagement/challanManagementData.service');

// Get all challan management dropdown values
router.get('/dropdowns', async (req, res) => {
  try {
    const data = await getChallanManagementDropdownValues();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch challan management dropdown values.', details: error.message });
  }
});

// Create a new challan management dropdown document
router.post('/dropdowns', async (req, res) => {
  try {
    const newDropdown = await createChallanManagementDropdown(req.body);
    res.status(201).json(newDropdown);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create challan management dropdown.', details: error.message });
  }
});

// Update an existing challan management dropdown document by id
router.put('/dropdowns/:id', async (req, res) => {
  try {
    const updatedDropdown = await updateChallanManagementDropdown(req.params.id, req.body);
    if (!updatedDropdown) {
      return res.status(404).json({ error: 'Challan management dropdown not found.' });
    }
    res.json(updatedDropdown);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update challan management dropdown.', details: error.message });
  }
});

// Delete a challan management dropdown document by id
router.delete('/dropdowns/:id', async (req, res) => {
  try {
    const deletedDropdown = await deleteChallanManagementDropdown(req.params.id);
    if (!deletedDropdown) {
      return res.status(404).json({ error: 'Challan management dropdown not found.' });
    }
    res.json({ message: 'Challan management dropdown deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete challan management dropdown.', details: error.message });
  }
});

// Get a single challan management dropdown document by id
router.get('/dropdowns/:id', async (req, res) => {
  try {
    const dropdown = await getChallanManagementDropdownById(req.params.id);
    if (!dropdown) {
      return res.status(404).json({ error: 'Challan management dropdown not found.' });
    }
    res.json(dropdown);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch challan management dropdown.', details: error.message });
  }
});

module.exports = router;