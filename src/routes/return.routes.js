const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/return.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { scanAWBValidator, updateAWBValidator } = require('../validators/awb.validator');
const { validate } = require('../middleware/validate');
const { uploadFile } = require('../middleware/upload.middleware');
const missingCtrl = require('../controllers/missingReturn.controller');

router.use(authenticate);

// ── Missing AWB (before /:id param routes) ────────────────────────────────
router.post('/missing/preview', uploadFile, missingCtrl.previewMissing);
router.post('/missing/save', missingCtrl.saveMissing);

// Specific named routes BEFORE /:id param routes
router.post('/scan', scanAWBValidator, validate, ctrl.scanAWB);
// Generic CRUD routes
router.get('/', ctrl.getAWBs);
router.get('/:id', ctrl.getAWBById);
router.put('/:id', updateAWBValidator, validate, ctrl.updateAWB);
router.delete('/:id', authorize('admin'), ctrl.deleteAWB);

module.exports = router;
