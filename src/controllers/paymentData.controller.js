const paymentDataService = require('../services/paymentData.service');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * Controller to create a new payment data entry.
 * All fields are arrays for dropdowns. See @PaymentData.js (1-23).
 * POST /api/v1/payment-data
 */
async function createPaymentData(req, res, next) {
  try {
    const payload = req.body;
    // Ensure all dropdown fields are arrays for backend safety
    if (
      !Array.isArray(payload.receiverName) ||
      !Array.isArray(payload.senderName) ||
      !Array.isArray(payload.department)
    ) {
      return sendError(res, 400, "All dropdown fields (receiverName, senderName, department) must be arrays.");
    }
    const result = await paymentDataService.createPaymentData(payload);
    return sendSuccess(res, 201, 'Payment data created successfully.', result);
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to get all payment data entries.
 * All fields are arrays for dropdowns.
 * GET /api/v1/payment-data
 */
async function getAllPaymentData(req, res, next) {
  try {
    const result = await paymentDataService.getAllPaymentData();
    return sendSuccess(res, 200, 'Fetched all payment data.', result);
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to get a single payment data entry by ID.
 * All fields are arrays for dropdowns.
 * GET /api/v1/payment-data/:id
 */
async function getPaymentDataById(req, res, next) {
  try {
    const { id } = req.params;
    const result = await paymentDataService.getPaymentDataById(id);
    if (!result) {
      return sendError(res, 404, 'Payment data not found.', null);
    }
    return sendSuccess(res, 200, 'Fetched payment data.', result);
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to update a payment data entry by ID.
 * All dropdown fields must be arrays (see model @PaymentData.js lines 1-23).
 * PUT /api/v1/payment-data/:id
 */
async function updatePaymentDataById(req, res, next) {
  try {
    const { id } = req.params;
    const update = req.body;
    // Only allow updating if provided fields are arrays
    if (
      ('receiverName' in update && !Array.isArray(update.receiverName)) ||
      ('senderName' in update && !Array.isArray(update.senderName)) ||
      ('department' in update && !Array.isArray(update.department))
    ) {
      return sendError(res, 400, "All dropdown fields (receiverName, senderName, department) must be arrays.");
    }
    const result = await paymentDataService.updatePaymentDataById(id, update);
    if (!result) {
      return sendError(res, 404, 'Payment data not found.', null);
    }
    return sendSuccess(res, 200, 'Payment data updated successfully.', result);
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to delete a payment data entry by ID.
 * DELETE /api/v1/payment-data/:id
 */
async function deletePaymentDataById(req, res, next) {
  try {
    const { id } = req.params;
    const result = await paymentDataService.deletePaymentDataById(id);
    if (!result) {
      return sendError(res, 404, 'Payment data not found.', null);
    }
    return sendSuccess(res, 200, 'Payment data deleted successfully.', result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createPaymentData,
  getAllPaymentData,
  getPaymentDataById,
  updatePaymentDataById,
  deletePaymentDataById,
};