const challanEntryService = require('../../../services/productionManagement/challanManagement/challanEntry.service');

async function fetchChallanEntryController(req, res) {
  try {
    const { station, date } = req.params;
    const result = await challanEntryService.fetchOrBuildEntry(station, date);
    res.json({ success: true, data: result.entry, isNew: result.isNew });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function saveChallanEntryController(req, res) {
  try {
    const { station, date } = req.params;
    const { platforms, totalReturns, sign, userId } = req.body;
    const saved = await challanEntryService.saveEntry(station, date, { platforms, totalReturns, sign, userId });
    res.json({ success: true, data: saved });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = { fetchChallanEntryController, saveChallanEntryController };
