

const challanEntryService = require('../../../services/productionManagement/challanManagement/challanEntry.service');
 
/**
 * Controller to fetch (or build) a challan entry for a given station and date.
 */
async function fetchChallanEntryController(req, res) {
  try {
    const { station, date } = req.params;
    const result = await challanEntryService.fetchOrBuildEntry(station, date);
    res.json({ success: true, data: result.entry, isNew: result.isNew });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}
 
/**
 * Controller to save a challan entry for a given station and date.
 *
 * Label Station sends this as multipart/form-data (via the `uploadImage`
 * middleware on the route) when a challan photo is attached, so `platforms`
 * arrives as a JSON string rather than a parsed array/object — it's parsed
 * back out here. Dispatch/Return keep sending plain JSON, which passes
 * through multer untouched.
 */
async function saveChallanEntryController(req, res) {
  try {
    const { station, date } = req.params;
    let { platforms, totalReturns, remark, userId, challanSign } = req.body;

    if (typeof platforms === 'string') {
      try {
        platforms = JSON.parse(platforms);
      } catch (e) {
        return res.status(400).json({ success: false, message: 'Invalid platforms payload.' });
      }
    }

    // Uploaded challan photo (Label Station only) — set by the uploadImage
    // multer middleware as req.file when a file was attached.
    let challanPhotoUrl;
    if (req.file) {
      challanPhotoUrl = `/uploads/${req.file.filename}`;
    }

    const saved = await challanEntryService.saveEntry(station, date, {
      platforms,
      totalReturns,
      remark,
      challanPhotoUrl,
      userId,
      challanSign,
    });
    res.json({ success: true, data: saved });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}
 
/**
 * Controller to fetch all Dispatch/Return entries still pending verification.
 * GET /challan/entries/pending-verifications
 */
async function fetchPendingVerificationsController(req, res) {
  try {
    const data = await challanEntryService.fetchPendingVerifications();
    res.json({ success: true, data, total: data.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
 
/**
 * Controller for the common dashboard's Challan Management figures.
 * GET /challan/entries/dashboard-stats
 */
async function fetchDashboardStatsController(req, res) {
  try {
    const data = await challanEntryService.fetchChallanDashboardStats(req.query);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
 
/**
 * Controller to verify dispatch or return challan entry.
 * POST /challan-entry/:station/:date/verify
 */
async function verifyChallanEntryController(req, res) {
  try {
    const { station, date } = req.params;
    const {
      verificationPasscode,
      channel,
      brand,
      courier,
      remark,
      missingOrderOrReturnCount,
      sign
    } = req.body;
 
    // The user from auth (e.g., req.user) can be used, or allow overriding via body.user
    const user = req.user.id;
 
    const verifiedEntry = await challanEntryService.verifyDispatchOrReturnEntry({
      station,
      dateStr: date,
      user: user,
      verificationPasscode,
      channel,
      brand,
      courier,
      remark,
      missingOrderOrReturnCount,
      sign
    });
 
    res.json({ success: true, data: verifiedEntry });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}
 
module.exports = {
  fetchChallanEntryController,
  saveChallanEntryController,
  verifyChallanEntryController,
  fetchPendingVerificationsController,
  fetchDashboardStatsController,
};












































