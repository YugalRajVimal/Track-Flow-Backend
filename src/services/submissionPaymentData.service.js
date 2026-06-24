const SubmissionPaymentData = require('../models/SubmissionPaymentData');

/**
 * Find a rate by program name, party name, and fabric type.
 * @param {String} programName 
 * @param {String} partyName 
 * @param {String} fabricType 
 * @returns {Promise<Object|null>} SubmissionPaymentData or null
 */
async function findRate(programName, partyName, fabricType) {
  return await SubmissionPaymentData.findOne({
    programName,
    partyName,
    fabricType
  });
}

/**
 * Create or update a rate document for the specified combination.
 * @param {String} programName 
 * @param {String} partyName 
 * @param {String} fabricType 
 * @param {Number} rate 
 * @returns {Promise<Object>} The upserted SubmissionPaymentData document
 */
async function upsertRate(programName, partyName, fabricType, rate) {
  return await SubmissionPaymentData.findOneAndUpdate(
    { programName, partyName, fabricType },
    { programName, partyName, fabricType, rate },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

/**
 * Delete a rate document for the specified combination.
 * @param {String} programName 
 * @param {String} partyName 
 * @param {String} fabricType 
 * @returns {Promise<{deletedCount: number}>}
 */
async function deleteRate(programName, partyName, fabricType) {
  return await SubmissionPaymentData.deleteOne({
    programName,
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