const { body } = require('express-validator');

const createUserValidator = [
  body('name').notEmpty().withMessage('Name is required').trim(),
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('passcode')
    .notEmpty().withMessage('Passcode is required')
    .matches(/^\d{5}$/).withMessage('Passcode must be exactly 5 digits'),
  body('role')
    .optional()
    .isIn(['admin', 'user', 'handler']).withMessage('Role must be admin, user, or handler'),
];

const updateUserValidator = [
  body('name').optional().notEmpty().withMessage('Name cannot be empty').trim(),
  body('email')
    .optional()
    .isEmail().withMessage('Please provide a valid email'),
  body('password')
    .optional()
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('passcode')
    .optional()
    .matches(/^\d{5}$/).withMessage('Passcode must be exactly 5 digits'),
  body('role')
    .optional()
    .isIn(['admin', 'user', 'handler']).withMessage('Role must be admin, user, or handler'),
];

module.exports = { createUserValidator, updateUserValidator };
