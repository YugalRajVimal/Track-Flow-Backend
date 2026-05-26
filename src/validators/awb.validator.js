const { body } = require('express-validator');

const AWB_REGEX = /^[a-zA-Z0-9]+$/;

const scanAWBValidator = [
  body('awbId')
    .notEmpty().withMessage('AWB ID is required')
    .trim()
    .isLength({ min: 6 }).withMessage('AWB ID must be at least 6 characters')
    .isLength({ max: 30 }).withMessage('AWB ID cannot exceed 30 characters')
    .matches(AWB_REGEX).withMessage('AWB ID must be alphanumeric'),
  body('channelPartnerId')
    .notEmpty().withMessage('Channel partner ID is required')
    .isMongoId().withMessage('Invalid channel partner ID'),
  body('brandId')
    .notEmpty().withMessage('Brand ID is required')
    .isMongoId().withMessage('Invalid brand ID'),
];

const updateAWBValidator = [
  body('awbId')
    .optional()
    .trim()
    .isLength({ min: 6 }).withMessage('AWB ID must be at least 6 characters')
    .isLength({ max: 30 }).withMessage('AWB ID cannot exceed 30 characters')
    .matches(AWB_REGEX).withMessage('AWB ID must be alphanumeric'),
  body('status')
    .optional()
    .isIn(['dispatched', 'cancelled']).withMessage('Invalid status'),
];

module.exports = { scanAWBValidator, updateAWBValidator };
