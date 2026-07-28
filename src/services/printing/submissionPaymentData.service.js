const SubmissionPaymentData = require('../../models/printing/PrintingSubmissionPaymentData');

/**
 * Find a rate by process name, receiver party name, and fabric type.
 * @param {String} processName 
 * @param {String} receiverPartyName 
 * @param {String} fabricType 
 * @returns {Promise<Object|null>} SubmissionPaymentData or null
 */
async function findRate(processName, receiverPartyName, fabricType) {
  return await SubmissionPaymentData.findOne({
    processName,
    receiverPartyName,
    fabricType
  });
}

/**
 * Create or update a rate document for the specified combination.
 * @param {String} processName 
 * @param {String} receiverPartyName 
 * @param {String} fabricType 
 * @param {Number} rate 
 * @returns {Promise<Object>} The upserted SubmissionPaymentData document
 */
async function upsertRate(processName, receiverPartyName, fabricType, rate) {
  return await SubmissionPaymentData.findOneAndUpdate(
    { processName, receiverPartyName, fabricType },
    { processName, receiverPartyName, fabricType, rate },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

/**
 * Delete a rate document for the specified combination.
 * @param {String} processName 
 * @param {String} receiverPartyName 
 * @param {String} fabricType 
 * @returns {Promise<{deletedCount: number}>}
 */
async function deleteRate(processName, receiverPartyName, fabricType) {
  return await SubmissionPaymentData.deleteOne({
    processName,
    receiverPartyName,
    fabricType
  });
}

/**
 * Get all SubmissionPaymentData documents.
 * @returns {Promise<Array>} Array of SubmissionPaymentData
 */
async function getAllRates() {
  return await SubmissionPaymentData.find({});
}

module.exports = {
  findRate,
  upsertRate,
  deleteRate,
  getAllRates,
};