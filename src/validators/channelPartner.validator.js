const { body } = require('express-validator');

const createChannelPartnerValidator = [
  body('name').notEmpty().withMessage('Name is required').trim(),
  body('code').notEmpty().withMessage('Code is required').trim(),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
];

const updateChannelPartnerValidator = [
  body('name').optional().notEmpty().withMessage('Name cannot be empty').trim(),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
];

module.exports = { createChannelPartnerValidator, updateChannelPartnerValidator };
