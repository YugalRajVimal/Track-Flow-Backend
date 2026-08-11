const fabricatorRateService = require('../../services/productionManagement/fabricatorRate.service');

async function createFabricatorRateController(req, res) {
  try {
    const created = await fabricatorRateService.createFabricatorRate(req.body);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    // Duplicate key (unique index) → friendlier message
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'A Rate already exists for this Style Name + Style Cutting + Fabricator combination.' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
}

async function updateFabricatorRateController(req, res) {
  try {
    const updated = await fabricatorRateService.updateFabricatorRate(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, message: 'Rate not found.' });
    res.json({ success: true, data: updated });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'A Rate already exists for this Style Name + Style Cutting + Fabricator combination.' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
}

async function deleteFabricatorRateController(req, res) {
  try {
    const deleted = await fabricatorRateService.deleteFabricatorRate(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Rate not found.' });
    res.json({ success: true, message: 'Rate deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function fetchFabricatorRatesController(req, res) {
  try {
    const data = await fabricatorRateService.fetchFabricatorRates(req.query);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function fetchFabricatorRateByIdController(req, res) {
  try {
    const doc = await fabricatorRateService.fetchFabricatorRateById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Rate not found.' });
    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function lookupFabricatorRateController(req, res) {
  try {
    const { styleName, styleCutting, fabricatorName } = req.query;
    if (!styleName || !styleCutting || !fabricatorName) {
      return res.status(400).json({ success: false, message: 'styleName, styleCutting and fabricatorName query params are required.' });
    }
    const doc = await fabricatorRateService.lookupFabricatorRate({ styleName, styleCutting, fabricatorName });
    if (!doc) return res.status(404).json({ success: false, message: 'No rate configured for this combination.' });
    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  createFabricatorRateController,
  updateFabricatorRateController,
  deleteFabricatorRateController,
  fetchFabricatorRatesController,
  fetchFabricatorRateByIdController,
  lookupFabricatorRateController,
};
