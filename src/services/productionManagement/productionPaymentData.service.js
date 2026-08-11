const PaymentData = require('../../models/production-management/productionPaymentData');

/**
 * Create a new payment data entry.
 * The structure is:
 * {
 *   departments: [
 *     { name: string, senderNames: [string], receiverNames: [string] }
 *   ]
 * }
 * @param {Object} data - The payment data to create.
 *   { departments: [ { name, senderNames, receiverNames } ] }
 * @returns {Promise<Object>} The newly created payment data.
 */
async function createPaymentData(data) {
  // Accept input either as { departments } or in legacy flat mode for BC
  let departments = Array.isArray(data.departments)
    ? data.departments.map((dept) => ({
        name: dept.name || "",
        senderNames: Array.isArray(dept.senderNames) ? dept.senderNames : (dept.senderNames ? [dept.senderNames] : []),
        receiverNames: Array.isArray(dept.receiverNames) ? dept.receiverNames : (dept.receiverNames ? [dept.receiverNames] : []),
      }))
    : [];

  // Legacy input: receiverName, senderName, department as parallel arrays
  if (!departments.length && Array.isArray(data.department)) {
    const deptArr = data.department;
    const senderArr = Array.isArray(data.senderName) ? data.senderName : (typeof data.senderName === "string" ? [data.senderName] : []);
    const receiverArr = Array.isArray(data.receiverName) ? data.receiverName : (typeof data.receiverName === "string" ? [data.receiverName] : []);
    // We allow lengths to differ
    for (let i = 0; i < deptArr.length; i++) {
      departments.push({
        name: deptArr[i] || "",
        senderNames: senderArr[i] ? [senderArr[i]] : [],
        receiverNames: receiverArr[i] ? [receiverArr[i]] : [],
      });
    }
  }

  const paymentData = new PaymentData({ departments });
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
 * Payload should be in the { departments: [...] } format as per model.
 * @param {string} id - The ID of the payment data to update.
 * @param {Object} update - The update to apply (departments).
 * @returns {Promise<Object|null>} The updated entry or null if not found.
 */
async function updatePaymentDataById(id, update) {
  let normalized = {};

  if (Array.isArray(update.departments)) {
    normalized.departments = update.departments.map((dept) => ({
      name: dept.name || "",
      senderNames: Array.isArray(dept.senderNames) ? dept.senderNames : (dept.senderNames ? [dept.senderNames] : []),
      receiverNames: Array.isArray(dept.receiverNames) ? dept.receiverNames : (dept.receiverNames ? [dept.receiverNames] : []),
    }));
  } else if (update.department || update.senderName || update.receiverName) {
    // Legacy flat update shape
    const deptArr = Array.isArray(update.department) ? update.department : [];
    const senderArr = Array.isArray(update.senderName) ? update.senderName : (typeof update.senderName === "string" ? [update.senderName] : []);
    const receiverArr = Array.isArray(update.receiverName) ? update.receiverName : (typeof update.receiverName === "string" ? [update.receiverName] : []);
    normalized.departments = [];
    for (let i = 0; i < deptArr.length; i++) {
      normalized.departments.push({
        name: deptArr[i] || "",
        senderNames: senderArr[i] ? [senderArr[i]] : [],
        receiverNames: receiverArr[i] ? [receiverArr[i]] : [],
      });
    }
  }

  // Only updating present fields (departments)
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