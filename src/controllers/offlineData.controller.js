const express = require('express');
const router = express.Router();
const {
  getOfflineDropdownValues,
  createOfflineDropdown,
  updateOfflineDropdown,
  deleteOfflineDropdown,
  getOfflineDropdownById
} = require('../services/offlineData.service');

// Get all offline dropdown values (styleTypes, salesMen, partyNames)
router.get('/dropdowns', async (req, res) => {
  try {
    const data = await getOfflineDropdownValues();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch offline dropdown values.', details: error.message });
  }
});

// Create a new offline dropdown document
router.post('/dropdowns', async (req, res) => {
  try {
    const newDropdown = await createOfflineDropdown(req.body);
    res.status(201).json(newDropdown);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create offline dropdown.', details: error.message });
  }
});

// Update an existing offline dropdown document by id
router.put('/dropdowns/:id', async (req, res) => {
  try {
    const updatedDropdown = await updateOfflineDropdown(req.params.id, req.body);
    if (!updatedDropdown) {
      return res.status(404).json({ error: 'Offline dropdown not found.' });
    }
    res.json(updatedDropdown);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update offline dropdown.', details: error.message });
  }
});

// Delete an offline dropdown document by id
router.delete('/dropdowns/:id', async (req, res) => {
  try {
    const deletedDropdown = await deleteOfflineDropdown(req.params.id);
    if (!deletedDropdown) {
      return res.status(404).json({ error: 'Offline dropdown not found.' });
    }
    res.json({ message: 'Offline dropdown deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete offline dropdown.', details: error.message });
  }
});

// Get a single offline dropdown document by id
router.get('/dropdowns/:id', async (req, res) => {
  try {
    const dropdown = await getOfflineDropdownById(req.params.id);
    if (!dropdown) {
      return res.status(404).json({ error: 'Offline dropdown not found.' });
    }
    res.json(dropdown);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch offline dropdown.', details: error.message });
  }
});

module.exports = router;