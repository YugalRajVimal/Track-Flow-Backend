const PaymentRecord = require('../../models/printing/printingPaymentRecord');

// Create a new payment record
async function createPaymentRecord(data) {
  const paymentRecord = new PaymentRecord(data);
  return await paymentRecord.save();
}

// Get all payment records, optionally filtered
async function getPaymentRecords(filter = {}) {
  return await PaymentRecord.find(filter).sort({ date: -1 }); // newest first
}

// Get payment record by ID
async function getPaymentRecordById(recordId) {
  return await PaymentRecord.findById(recordId);
}

// Update an existing payment record
async function updatePaymentRecord(recordId, update) {
  return await PaymentRecord.findByIdAndUpdate(recordId, update, { new: true });
}

// Delete a payment record
async function deletePaymentRecord(recordId) {
  return await PaymentRecord.findByIdAndDelete(recordId);
}

module.exports = {
  createPaymentRecord,
  getPaymentRecords,
  getPaymentRecordById,
  updatePaymentRecord,
  deletePaymentRecord,
};