// const express = require('express');
// const router = express.Router();
// const paymentRecordController = require('../../controllers/productionManagement/productionPaymentRecord.controller');
// const { uploadImageFields } = require('../../middleware/imageUploadMiddlware');



// // Create a new payment record
// router.post('/',uploadImageFields([{ name: 'photoUpload', maxCount: 1 }]), paymentRecordController.createPaymentRecord);

// // Get all payment records (optionally filtered by query)
// router.get('/', paymentRecordController.getPaymentRecords);

// // Get a payment record by ID
// router.get('/:id', paymentRecordController.getPaymentRecordById);

// // Update a payment record by ID
// router.put('/:id',uploadImageFields([{ name: 'photoUpload', maxCount: 1 }]), paymentRecordController.updatePaymentRecord);

// // Delete a payment record by ID
// router.delete('/:id', paymentRecordController.deletePaymentRecord);

// module.exports = router;

const express = require('express');
const router = express.Router();
const paymentRecordController = require('../../controllers/productionManagement/productionPaymentRecord.controller');
const { uploadImageFields } = require('../../middleware/imageUploadMiddlware');
const { authenticate, authorize } = require('../../middleware/auth');



// Create a new payment record
router.post('/',uploadImageFields([{ name: 'photoUpload', maxCount: 1 }]), paymentRecordController.createPaymentRecord);

// Get all payment records (optionally filtered by query)
router.get('/', paymentRecordController.getPaymentRecords);

// Get a payment record by ID
router.get('/:id', paymentRecordController.getPaymentRecordById);

// Update a payment record by ID — Admin-only.
router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  uploadImageFields([{ name: 'photoUpload', maxCount: 1 }]),
  paymentRecordController.updatePaymentRecord
);

// Delete a payment record by ID — Admin-only.
router.delete('/:id', authenticate, authorize('admin'), paymentRecordController.deletePaymentRecord);

module.exports = router;