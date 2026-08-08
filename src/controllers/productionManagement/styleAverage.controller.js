const styleAverageService = require('../../services/productionManagement/styleAverage.service');

async function createStyleAverageController(req, res) {
  try {
    const created = await styleAverageService.createStyleAverage(req.body);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    // Duplicate key (unique index) → friendlier message
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'A Style Average already exists for this Style Name + Style Cutting + Fabric Type combination.' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
}

async function updateStyleAverageController(req, res) {
  try {
    const updated = await styleAverageService.updateStyleAverage(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, message: 'Style Average not found.' });
    res.json({ success: true, data: updated });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'A Style Average already exists for this Style Name + Style Cutting + Fabric Type combination.' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
}

async function deleteStyleAverageController(req, res) {
  try {
    const deleted = await styleAverageService.deleteStyleAverage(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Style Average not found.' });
    res.json({ success: true, message: 'Style Average deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function fetchStyleAveragesController(req, res) {
  try {
    const data = await styleAverageService.fetchStyleAverages(req.query);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function fetchStyleAverageByIdController(req, res) {
  try {
    const doc = await styleAverageService.fetchStyleAverageById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Style Average not found.' });
    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function lookupStyleAverageController(req, res) {
  try {
    const { styleName, styleCutting, fabricType } = req.query;
    if (!styleName || !styleCutting || !fabricType) {
      return res.status(400).json({ success: false, message: 'styleName, styleCutting and fabricType query params are required.' });
    }
    const doc = await styleAverageService.lookupStyleAverage({ styleName, styleCutting, fabricType });
    if (!doc) return res.status(404).json({ success: false, message: 'No Style Average configured for this combination.' });
    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  createStyleAverageController,
  updateStyleAverageController,
  deleteStyleAverageController,
  fetchStyleAveragesController,
  fetchStyleAverageByIdController,
  lookupStyleAverageController,
};
