const express = require('express');
const router = express.Router();
const paymentRecordController = require('../../controllers/productionManagement/productionPaymentRecord.controller');

// Create a new payment record
router.post('/', paymentRecordController.createPaymentRecord);

// Get all payment records (optionally filtered by query)
router.get('/', paymentRecordController.getPaymentRecords);

// Get a payment record by ID
router.get('/:id', paymentRecordController.getPaymentRecordById);

// Update a payment record by ID
router.put('/:id', paymentRecordController.updatePaymentRecord);

// Delete a payment record by ID
router.delete('/:id', paymentRecordController.deletePaymentRecord);

module.exports = router;