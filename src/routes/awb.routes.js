// const express = require('express');
// const router = express.Router();
// const ctrl = require('../controllers/awb.controller');
// const { authenticate, authorize } = require('../middleware/auth');
// const { scanAWBValidator, updateAWBValidator } = require('../validators/awb.validator');
// const { validate } = require('../middleware/validate');

// router.use(authenticate);

// // Specific named routes BEFORE /:id param routes
// router.post('/scan', scanAWBValidator, validate, ctrl.scanAWB);
// router.put('/cancel/:awbId', ctrl.cancelAWB);

// // Generic CRUD routes
// router.get('/', ctrl.getAWBs);
// router.get('/:id', ctrl.getAWBById);
// router.put('/:id', updateAWBValidator, validate, ctrl.updateAWB);
// router.delete('/:id', authorize('admin'), ctrl.deleteAWB);
// router.post('/verify-passcode', ctrl.verifyPasscode);

// module.exports = router;


/**
 * awb.routes.js  (updated)
 *
 * Adds two new routes for the "Missing AWB" feature:
 *   POST /missing/preview  – multipart upload + date range  → preview
 *   POST /missing/save     – JSON body of confirmed rows    → bulk save
 *
 * NOTE: the /missing/* routes are declared BEFORE /:id so Express won't
 * accidentally match "missing" as a Mongo ObjectId.
 */

const express = require('express');
const router  = express.Router();

const ctrl        = require('../controllers/awb.controller');
const missingCtrl = require('../controllers/missingAWB.controller');

const { authenticate, authorize } = require('../middleware/auth');
const { uploadFile }              = require('../middleware/upload.middleware');
const { scanAWBValidator, updateAWBValidator } = require('../validators/awb.validator');
const { validate } = require('../middleware/validate');

router.use(authenticate);

// ── Missing AWB (before /:id param routes) ────────────────────────────────
router.post('/missing/preview', uploadFile, missingCtrl.previewMissing);
router.post('/missing/save',               missingCtrl.saveMissing);

// ── Specific named routes (before /:id param routes) ─────────────────────
router.post('/scan',              scanAWBValidator, validate, ctrl.scanAWB);
router.put('/cancel/:awbId',                        ctrl.cancelAWB);
router.post('/verify-passcode',                     ctrl.verifyPasscode);

// ── Generic CRUD ──────────────────────────────────────────────────────────
router.get('/',     ctrl.getAWBs);
router.get('/:id',  ctrl.getAWBById);
router.put('/:id',  updateAWBValidator, validate, ctrl.updateAWB);
router.delete('/:id', authorize('admin'), ctrl.deleteAWB);

module.exports = router;