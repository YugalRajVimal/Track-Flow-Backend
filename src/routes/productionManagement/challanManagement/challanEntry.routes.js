// const express = require('express');
// const router = express.Router();

// const {
//   fetchChallanEntryController,
//   saveChallanEntryController,
//   verifyChallanEntryController,
// } = require('../../../controllers/productionManagement/challanManagement/challanEntry.controller');
// const { authenticate } = require('../../../middleware/auth');

// // :station is 'label' | 'dispatch' | 'return', :date is 'YYYY-MM-DD'
// router.get('/:station/:date', fetchChallanEntryController);
// router.put('/:station/:date', saveChallanEntryController);
// router.post('/:station/:date/verify',authenticate, verifyChallanEntryController);

// module.exports = router;


const express = require('express');
const router = express.Router();
 
const {
  fetchChallanEntryController,
  saveChallanEntryController,
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
router.put('/:station/:date', uploadImage, saveChallanEntryController);
 
router.post('/:station/:date/verify', authenticate, verifyChallanEntryController);
 
module.exports = router;