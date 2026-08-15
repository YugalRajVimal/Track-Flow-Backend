const challanPlatformConfigService = require('../../../services/productionManagement/challanManagement/challanPlatformConfig.service');

async function createPlatformConfigController(req, res) {
  try {
    const created = await challanPlatformConfigService.createPlatformConfig(req.body);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'A platform with this name already exists.' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
}

async function updatePlatformConfigController(req, res) {
  try {
    const updated = await challanPlatformConfigService.updatePlatformConfig(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, message: 'Platform not found.' });
    res.json({ success: true, data: updated });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'A platform with this name already exists.' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
}

async function deletePlatformConfigController(req, res) {
  try {
    const deleted = await challanPlatformConfigService.deletePlatformConfig(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Platform not found.' });
    res.json({ success: true, message: 'Platform deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function fetchPlatformConfigsController(req, res) {
  try {
    const data = await challanPlatformConfigService.fetchPlatformConfigs(req.query);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function fetchPlatformConfigByIdController(req, res) {
  try {
    const doc = await challanPlatformConfigService.fetchPlatformConfigById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Platform not found.' });
    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  createPlatformConfigController,
  updatePlatformConfigController,
  deletePlatformConfigController,
  fetchPlatformConfigsController,
  fetchPlatformConfigByIdController,
};
