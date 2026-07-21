const paymentDataService = require('../../../services/printing/paymentData.service');
const { sendSuccess, sendError } = require('../../../utils/response');

/**
 * Controller to create a new payment data entry.
 * Payload is expected to follow PaymentData.js schema:
 * {
 *   departments: [
 *     { name: string, senderNames: [string], receiverNames: [string] }
 *   ]
 * }
 * POST /api/v1/payment-data
 */
async function createPaymentData(req, res, next) {
  try {
    const payload = req.body;

    // New structure: departments [{ name, senderNames, receiverNames }]
    if (!Array.isArray(payload.departments)) {
      return sendError(res, 400, "Field 'departments' must be an array of department objects.");
    }
    for (const dept of payload.departments) {
      if (
        typeof dept.name !== 'string' ||
        !Array.isArray(dept.senderNames) ||
        !Array.isArray(dept.receiverNames)
      ) {
        return sendError(
          res,
          400,
          "Every department must have: name (string), senderNames (string[]), receiverNames (string[])."
        );
      }
    }

    const result = await paymentDataService.createPaymentData(payload);
    return sendSuccess(res, 201, 'Payment data created successfully.', result);
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to get all payment data entries.
 * Returns arrays for departments, senders, and receivers for each department.
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
 * Returns arrays for departments, senders, and receivers for each department.
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
 * PUT /api/v1/payment-data/:id
 * Payload should match the PaymentData.js schema:
 * { departments: [ { name, senderNames, receiverNames } ] }
 */
async function updatePaymentDataById(req, res, next) {
  try {
    const { id } = req.params;
    const update = req.body;

    if ('departments' in update) {
      if (!Array.isArray(update.departments)) {
        return sendError(res, 400, "Field 'departments' must be an array of department objects.");
      }
      for (const dept of update.departments) {
        if (
          typeof dept.name !== 'string' ||
          !Array.isArray(dept.senderNames) ||
          !Array.isArray(dept.receiverNames)
        ) {
          return sendError(
            res,
            400,
            "Every department must have: name (string), senderNames (string[]), receiverNames (string[])."
          );
        }
      }
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