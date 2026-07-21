const submissionPaymentDataService = require('../../../services/printing/submissionPaymentData.service');
const { sendSuccess, sendError } = require('../../../utils/response');

/**
 * Get a single rate by programName, partyName, and fabricType
 * Expects query params: programName, partyName, fabricType
 */
async function getRate(req, res, next) {
  try {
    const { programName, partyName, fabricType } = req.query;
    // Validate existence of required query parameters
    if (
      typeof programName !== 'string' ||
      typeof partyName !== 'string' ||
      typeof fabricType !== 'string' ||
      !programName.trim() ||
      !partyName.trim() ||
      !fabricType.trim()
    ) {
      return sendError(res, 400, 'Missing required query parameters');
    }

    // Call the service to find the rate
    const rate = await submissionPaymentDataService.findRate(
      programName.trim(),
      partyName.trim(),
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
 * Upsert (create or update) a rate for a (programName, partyName, fabricType) combination.
 * Expects JSON body: { programName, partyName, fabricType, rate }
 */
async function upsertRate(req, res, next) {
  try {
    const { programName, partyName, fabricType, rate } = req.body;
    if (!programName || !partyName || !fabricType || typeof rate !== 'number') {
      return sendError(res, 400, 'Missing or invalid body parameters');
    }
    const result = await submissionPaymentDataService.upsertRate(programName, partyName, fabricType, rate);
    return sendSuccess(res, 200, 'Rate upserted successfully', result);
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a rate for a (programName, partyName, fabricType) combination.
 * Expects JSON body: { programName, partyName, fabricType }
 */
async function deleteRate(req, res, next) {
  try {
    const { programName, partyName, fabricType } = req.body;
    if (!programName || !partyName || !fabricType) {
      return sendError(res, 400, 'Missing body parameters');
    }
    const result = await submissionPaymentDataService.deleteRate(programName, partyName, fabricType);
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