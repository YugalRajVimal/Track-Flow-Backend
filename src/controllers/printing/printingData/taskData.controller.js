const express = require('express');
const router = express.Router();
const {
  getTaskDataDropdownValues,
  createTaskDataDropdown,
  updateTaskDataDropdown,
  deleteTaskDataDropdown,
  getTaskDataDropdownById
} = require('../../../services/printing/taskData.service');

// Get all task data dropdown values
router.get('/dropdowns', async (req, res) => {
  try {
    const data = await getTaskDataDropdownValues();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch task data dropdown values.', details: error.message });
  }
});

// Create a new task data dropdown document
router.post('/dropdowns', async (req, res) => {
  try {
    const newDropdown = await createTaskDataDropdown(req.body);
    res.status(201).json(newDropdown);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create task data dropdown.', details: error.message });
  }
});

// Update an existing task data dropdown document by id
router.put('/dropdowns/:id', async (req, res) => {
  try {
    const updatedDropdown = await updateTaskDataDropdown(req.params.id, req.body);
    if (!updatedDropdown) {
      return res.status(404).json({ error: 'Task data dropdown not found.' });
    }
    res.json(updatedDropdown);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update task data dropdown.', details: error.message });
  }
});

// Delete a task data dropdown document by id
router.delete('/dropdowns/:id', async (req, res) => {
  try {
    const deletedDropdown = await deleteTaskDataDropdown(req.params.id);
    if (!deletedDropdown) {
      return res.status(404).json({ error: 'Task data dropdown not found.' });
    }
    res.json({ message: 'Task data dropdown deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task data dropdown.', details: error.message });
  }
});

// Get a single task data dropdown document by id
router.get('/dropdowns/:id', async (req, res) => {
  try {
    const dropdown = await getTaskDataDropdownById(req.params.id);
    if (!dropdown) {
      return res.status(404).json({ error: 'Task data dropdown not found.' });
    }
    res.json(dropdown);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch task data dropdown.', details: error.message });
  }
});

module.exports = router;