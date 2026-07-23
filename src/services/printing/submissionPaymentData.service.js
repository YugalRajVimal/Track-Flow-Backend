const SubmissionPaymentData = require('../../models/printing/PrintingSubmissionPaymentData');

/**
 * Find a rate by print type, party name, and fabric type.
 * @param {String} printType 
 * @param {String} partyName 
 * @param {String} fabricType 
 * @returns {Promise<Object|null>} SubmissionPaymentData or null
 */
async function findRate(printType, partyName, fabricType) {
  return await SubmissionPaymentData.findOne({
    printType,
    partyName,
    fabricType
  });
}

/**
 * Create or update a rate document for the specified combination.
 * @param {String} printType 
 * @param {String} partyName 
 * @param {String} fabricType 
 * @param {Number} rate 
 * @returns {Promise<Object>} The upserted SubmissionPaymentData document
 */
async function upsertRate(printType, partyName, fabricType, rate) {
  return await SubmissionPaymentData.findOneAndUpdate(
    { printType, partyName, fabricType },
    { printType, partyName, fabricType, rate },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

/**
 * Delete a rate document for the specified combination.
 * @param {String} printType 
 * @param {String} partyName 
 * @param {String} fabricType 
 * @returns {Promise<{deletedCount: number}>}
 */
async function deleteRate(printType, partyName, fabricType) {
  return await SubmissionPaymentData.deleteOne({
    printType,
    partyName,
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