


// const express = require('express');
// const router = express.Router();
 
// const {
//   fetchChallanEntryController,
//   saveChallanEntryController,
//   verifyChallanEntryController,
//   fetchPendingVerificationsController,
//   fetchDashboardStatsController,
// } = require('../../../controllers/productionManagement/challanManagement/challanEntry.controller');
// const { authenticate } = require('../../../middleware/auth');
// const { uploadImage } = require('../../../middleware/imageUploadMiddlware');
 
// // Both are single-segment literal paths (vs. the two-segment
// // '/:station/:date' below) so there's no real routing collision here, but
// // they're kept above the param route anyway for clarity/consistency.
// router.get('/pending-verifications', fetchPendingVerificationsController);
// router.get('/dashboard-stats', fetchDashboardStatsController);
 
// // :station is 'label' | 'dispatch' | 'return', :date is 'YYYY-MM-DD'
// router.get('/:station/:date', fetchChallanEntryController);
 
// // uploadImage (multer, field name "challanPhotoUpload") only actually does
// // anything when the request is multipart/form-data — that's how Label
// // Station sends its save (to carry the challan photo). Dispatch/Return keep
// // sending plain JSON, which multer passes straight through untouched.
// router.put('/:station/:date', authenticate,uploadImage, saveChallanEntryController);
 
// router.post('/:station/:date/verify', authenticate, verifyChallanEntryController);
 
// module.exports = router;

const express = require('express');
const router = express.Router();

const {
  fetchChallanEntryController,
  saveChallanEntryController,
  deleteChallanEntryController,
  verifyChallanEntryController,
  fetchPendingVerificationsController,
  fetchDashboardStatsController,
} = require('../../../controllers/productionManagement/challanManagement/challanEntry.controller');
const { authenticate } = require('../../../middleware/auth');
const { uploadImage } = require('../../../middleware/imageUploadMiddlware');

// Both are single-segment literal paths (vs. the two-segment
// '/:station/:date' below) so there's no real routing collision here, but
// they're kept above the param route anyway for clarity/consistency.
router.get('/pending-verifications', fetchPendingVerificationsController);
router.get('/dashboard-stats', fetchDashboardStatsController);

// :station is 'label' | 'dispatch' | 'return', :date is 'YYYY-MM-DD'
router.get('/:station/:date', fetchChallanEntryController);

// uploadImage (multer, field name "challanPhotoUpload") only actually does
// anything when the request is multipart/form-data — that's how Label
// Station sends its save (to carry the challan photo). Dispatch/Return keep
// sending plain JSON, which multer passes straight through untouched.
// `authenticate` is required here so req.user is populated — the controller
// uses req.user.role to decide whether a non-admin is allowed to overwrite
// an already-saved/verified entry.
router.put('/:station/:date', authenticate, uploadImage, saveChallanEntryController);

// Admin-only delete — enforced in the controller via req.user.role, which
// requires this route to run through `authenticate` too.
router.delete('/:station/:date', authenticate, deleteChallanEntryController);

router.post('/:station/:date/verify', authenticate, verifyChallanEntryController);

module.exports = router;