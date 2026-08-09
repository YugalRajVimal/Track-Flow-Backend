const costManagementService = require('../../services/productionManagement/costManagement.service');

async function createCostManagementController(req, res) {
  try {
    const created = await costManagementService.createCostManagement(req.body);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function editCostManagementController(req, res) {
  try {
    const updated = await costManagementService.editCostManagement(req.params.recordId, req.body);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function fetchCostManagementsController(req, res) {
  try {
    const result = await costManagementService.fetchCostManagements(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function fetchCostManagementByIdController(req, res) {
  try {
    const record = await costManagementService.fetchCostManagementById(req.params.recordId);
    if (!record) return res.status(404).json({ success: false, message: 'Record not found.' });
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function deleteCostManagementController(req, res) {
  try {
    const deleted = await costManagementService.deleteCostManagement(req.params.recordId);
    if (!deleted) return res.status(404).json({ success: false, message: 'Record not found.' });
    res.json({ success: true, data: deleted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function previewStyleAverageController(req, res) {
  try {
    const { styleName, fabricType } = req.query;
    if (!styleName || !fabricType) {
      return res.status(400).json({ success: false, message: 'styleName and fabricType query params are required.' });
    }
    const preview = await costManagementService.previewStyleAverage(styleName, fabricType);
    res.json({ success: true, data: preview });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  createCostManagementController,
  editCostManagementController,
  fetchCostManagementsController,
  fetchCostManagementByIdController,
  deleteCostManagementController,
  previewStyleAverageController,
};
