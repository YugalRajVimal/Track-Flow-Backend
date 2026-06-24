const PaymentData = require('../models/PaymentData');

/**
 * Create a new payment data entry.
 * All dropdown fields should be arrays.
 * @param {Object} data - The payment data to create.
 * @param {Array<string>} data.receiverName
 * @param {Array<string>} data.senderName
 * @param {Array<string>} data.department
 * @returns {Promise<Object>} The newly created payment data.
 */
async function createPaymentData(data) {
  // Ensure all fields are arrays for dropdowns
  const normalized = {
    receiverName: Array.isArray(data.receiverName) ? data.receiverName : (data.receiverName ? [data.receiverName] : []),
    senderName: Array.isArray(data.senderName) ? data.senderName : (data.senderName ? [data.senderName] : []),
    department: Array.isArray(data.department) ? data.department : (data.department ? [data.department] : []),
  };
  const paymentData = new PaymentData(normalized);
  return await paymentData.save();
}

/**
 * Retrieve all payment data entries.
 * @returns {Promise<Array>} List of all payment data entries.
 */
async function getAllPaymentData() {
  return await PaymentData.find();
}

/**
 * Retrieve a single payment data entry by ID.
 * @param {string} id - The ID of the payment data.
 * @returns {Promise<Object|null>} The payment data entry or null if not found.
 */
async function getPaymentDataById(id) {
  return await PaymentData.findById(id);
}

/**
 * Update a payment data entry by ID.
 * All dropdown fields should be arrays.
 * @param {string} id - The ID of the payment data to update.
 * @param {Object} update - The update to apply.
 * @returns {Promise<Object|null>} The updated entry or null if not found.
 */
async function updatePaymentDataById(id, update) {
  // Ensure all fields are arrays for dropdowns during update
  const normalized = {};
  if (update.receiverName !== undefined) {
    normalized.receiverName = Array.isArray(update.receiverName)
      ? update.receiverName
      : (update.receiverName ? [update.receiverName] : []);
  }
  if (update.senderName !== undefined) {
    normalized.senderName = Array.isArray(update.senderName)
      ? update.senderName
      : (update.senderName ? [update.senderName] : []);
  }
  if (update.department !== undefined) {
    normalized.department = Array.isArray(update.department)
      ? update.department
      : (update.department ? [update.department] : []);
  }
  // Only updating present fields
  return await PaymentData.findByIdAndUpdate(id, normalized, { new: true });
}

/**
 * Delete a payment data entry by ID.
 * @param {string} id - The ID of the payment data to delete.
 * @returns {Promise<Object|null>} The deleted entry or null if not found.
 */
async function deletePaymentDataById(id) {
  return await PaymentData.findByIdAndDelete(id);
}

module.exports = {
  createPaymentData,
  getAllPaymentData,
  getPaymentDataById,
  updatePaymentDataById,
  deletePaymentDataById,
};