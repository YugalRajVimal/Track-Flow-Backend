const { body } = require('express-validator');

const createBrandValidator = [
  body('name').notEmpty().withMessage('Brand name is required').trim(),
  body('channelPartner')
    .notEmpty().withMessage('Channel partner is required')
    .isMongoId().withMessage('Invalid channel partner ID'),
];

const updateBrandValidator = [
  body('name').optional().notEmpty().withMessage('Name cannot be empty').trim(),
  body('channelPartner')
    .optional()
    .isMongoId().withMessage('Invalid channel partner ID'),
];

module.exports = { createBrandValidator, updateBrandValidator };
