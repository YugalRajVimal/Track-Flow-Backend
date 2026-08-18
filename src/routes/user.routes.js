const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { createUserValidator, updateUserValidator } = require('../validators/user.validator');
const { validate } = require('../middleware/validate');

// All admin-only routes use authenticate+authorize('admin')
// But verify-payment-department-passcode and verify-verification-passcode routes should be role-specific

// Protected admin-only routes
router.get('/', authenticate, authorize('admin'), ctrl.getUsers);
router.post('/', authenticate, authorize('admin'), createUserValidator, validate, ctrl.createUser);
router.put('/:id', authenticate, authorize('admin'), updateUserValidator, validate, ctrl.updateUser);
router.delete('/:id', authenticate, authorize('admin'), ctrl.deleteUser);
router.patch('/:id/status', authenticate, authorize('admin'), ctrl.updateUserStatus);

// Role-specific verification routes
// Payment Department Passcode
router.post('/verify-payment-department-passcode', authenticate, authorize('dying-factory'), ctrl.verifyPaymentDepartmentPasscode);
router.post('/printing/verify-payment-department-passcode', authenticate, authorize('printing-factory'), ctrl.verifyPaymentDepartmentPasscode);
router.post('/production/verify-payment-department-passcode', authenticate, authorize('stitching-factory'), ctrl.verifyPaymentDepartmentPasscode);


router.post('/production/verify-verification-passcode', authenticate, authorize('stitching-factory'), ctrl.verifyVerificationPasscode);

module.exports = router;
