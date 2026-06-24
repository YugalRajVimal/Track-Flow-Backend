const express = require('express');
const router = express.Router();

const submissionPaymentDataController = require('../controllers/submissionPaymentData.controller');

// Get rate for a specific (programName, partyName, fabricType) - expects query params
router.get('/rate', submissionPaymentDataController.getRate);

// Upsert a rate - expects JSON body: { programName, partyName, fabricType, rate }
router.post('/rate', submissionPaymentDataController.upsertRate);

// Delete a rate - expects JSON body: { programName, partyName, fabricType }
router.delete('/rate', submissionPaymentDataController.deleteRate);

// Get all rates
router.get('/all', submissionPaymentDataController.getAllRates);

module.exports = router;