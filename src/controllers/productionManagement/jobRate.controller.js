const jobRateService = require('../../services/productionManagement/jobRate.service');

async function createJobRateController(req, res) {
  try {
    const created = await jobRateService.createJobRate(req.body);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    // Duplicate key (unique index) → friendlier message
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'A Job Rate already exists for this Print Type + Fabric Type + Dyer Name combination.' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
}

async function updateJobRateController(req, res) {
  try {
    const updated = await jobRateService.updateJobRate(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, message: 'Job Rate not found.' });
    res.json({ success: true, data: updated });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'A Job Rate already exists for this Print Type + Fabric Type + Dyer Name combination.' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
}

async function deleteJobRateController(req, res) {
  try {
    const deleted = await jobRateService.deleteJobRate(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Job Rate not found.' });
    res.json({ success: true, message: 'Job Rate deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function fetchJobRatesController(req, res) {
  try {
    const data = await jobRateService.fetchJobRates(req.query);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function fetchJobRateByIdController(req, res) {
  try {
    const doc = await jobRateService.fetchJobRateById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Job Rate not found.' });
    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function lookupJobRateController(req, res) {
  try {
    const { printType, fabricType, dyerName } = req.query;
    if (!printType || !fabricType || !dyerName) {
      return res.status(400).json({ success: false, message: 'printType, fabricType and dyerName query params are required.' });
    }
    const doc = await jobRateService.lookupJobRate({ printType, fabricType, dyerName });
    if (!doc) return res.status(404).json({ success: false, message: 'No Job Rate configured for this combination.' });
    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  createJobRateController,
  updateJobRateController,
  deleteJobRateController,
  fetchJobRatesController,
  fetchJobRateByIdController,
  lookupJobRateController,
};
