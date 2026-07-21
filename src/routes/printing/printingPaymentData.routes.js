const express = require('express');
const router = express.Router();
const paymentDataController = require('../../controllers/printing/printingData/paymentData.controller');

// Create a new payment data entry
router.post('/', paymentDataController.createPaymentData);

// Get all payment data entries
router.get('/', paymentDataController.getAllPaymentData);

// Get a single payment data entry by ID
router.get('/:id', paymentDataController.getPaymentDataById);

// Update a payment data entry by ID
router.put('/:id', paymentDataController.updatePaymentDataById);

// Delete a payment data entry by ID
router.delete('/:id', paymentDataController.deletePaymentDataById);

module.exports = router;