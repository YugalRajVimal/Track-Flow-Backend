const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/awb.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { scanAWBValidator, updateAWBValidator } = require('../validators/awb.validator');
const { validate } = require('../middleware/validate');

router.use(authenticate);

// Specific named routes BEFORE /:id param routes
router.post('/scan', scanAWBValidator, validate, ctrl.scanAWB);
router.put('/cancel/:awbId', ctrl.cancelAWB);

// Generic CRUD routes
router.get('/', ctrl.getAWBs);
router.get('/:id', ctrl.getAWBById);
router.put('/:id', updateAWBValidator, validate, ctrl.updateAWB);
router.delete('/:id', authorize('admin'), ctrl.deleteAWB);

module.exports = router;
