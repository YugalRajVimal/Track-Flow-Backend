const submissionPaymentDataService = require('../../../services/printing/submissionPaymentData.service');
const { sendSuccess, sendError } = require('../../../utils/response');

/**
 * Get a single rate by processName, receiverPartyName, and fabricType
 * Expects query params: processName, receiverPartyName, fabricType
 */
async function getRate(req, res, next) {
  try {
    const { processName, receiverPartyName, fabricType } = req.query;
    // Validate existence of required query parameters
    if (
      typeof processName !== 'string' ||
      typeof receiverPartyName !== 'string' ||
      typeof fabricType !== 'string' ||
      !processName.trim() ||
      !receiverPartyName.trim() ||
      !fabricType.trim()
    ) {
      return sendError(res, 400, 'Missing required query parameters');
    }

    // Call the service to find the rate
    const rate = await submissionPaymentDataService.findRate(
      processName.trim(),
      receiverPartyName.trim(),
      fabricType.trim()
    );
    if (!rate) {
      return sendError(res, 404, 'Rate not found');
    }

    return sendSuccess(res, 200, 'Rate found', rate);
  } catch (error) {
    return next(error);
  }
}

/**
 * Upsert (create or update) a rate for a (processName, receiverPartyName, fabricType) combination.
 * Expects JSON body: { processName, receiverPartyName, fabricType, rate }
 */
async function upsertRate(req, res, next) {
  try {
    const { processName, receiverPartyName, fabricType, rate } = req.body;
    if (!processName || !receiverPartyName || !fabricType || typeof rate !== 'number') {
      return sendError(res, 400, 'Missing or invalid body parameters');
    }
    const result = await submissionPaymentDataService.upsertRate(processName, receiverPartyName, fabricType, rate);
    return sendSuccess(res, 200, 'Rate upserted successfully', result);
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a rate for a (processName, receiverPartyName, fabricType) combination.
 * Expects JSON body: { processName, receiverPartyName, fabricType }
 */
async function deleteRate(req, res, next) {
  try {
    const { processName, receiverPartyName, fabricType } = req.body;
    if (!processName || !receiverPartyName || !fabricType) {
      return sendError(res, 400, 'Missing body parameters');
    }
    const result = await submissionPaymentDataService.deleteRate(processName, receiverPartyName, fabricType);
    if (result.deletedCount === 0) {
      return sendError(res, 404, 'Rate not found');
    }
    return sendSuccess(res, 200, 'Rate deleted successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Get all SubmissionPaymentData rates.
 */
async function getAllRates(req, res, next) {
  try {
    const rates = await submissionPaymentDataService.getAllRates();
    return sendSuccess(res, 200, 'Rates fetched successfully', rates);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getRate,
  upsertRate,
  deleteRate,
  getAllRates,
};