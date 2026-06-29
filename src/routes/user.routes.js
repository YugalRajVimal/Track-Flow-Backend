const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { createUserValidator, updateUserValidator } = require('../validators/user.validator');
const { validate } = require('../middleware/validate');

// All admin-only routes use authenticate+authorize('admin')
// But verify-payment-department-passcode should be PUBLIC (no auth)

// Protected admin-only routes
router.get('/', authenticate, authorize('admin'), ctrl.getUsers);
router.post('/', authenticate, authorize('admin'), createUserValidator, validate, ctrl.createUser);
router.put('/:id', authenticate, authorize('admin'), updateUserValidator, validate, ctrl.updateUser);
router.delete('/:id', authenticate, authorize('admin'), ctrl.deleteUser);
router.patch('/:id/status', authenticate, authorize('admin'), ctrl.updateUserStatus);

// Public route (no authentication/authorization)
router.post('/verify-payment-department-passcode', authenticate, authorize('user'),  ctrl.verifyPaymentDepartmentPasscode);

module.exports = router;
