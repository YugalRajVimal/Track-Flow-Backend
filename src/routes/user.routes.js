const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { createUserValidator, updateUserValidator } = require('../validators/user.validator');
const { validate } = require('../middleware/validate');

router.use(authenticate, authorize('admin'));

router.get('/', ctrl.getUsers);
router.post('/', createUserValidator, validate, ctrl.createUser);
router.put('/:id', updateUserValidator, validate, ctrl.updateUser);
router.delete('/:id', ctrl.deleteUser);
router.patch('/:id/status', ctrl.updateUserStatus);



module.exports = router;
