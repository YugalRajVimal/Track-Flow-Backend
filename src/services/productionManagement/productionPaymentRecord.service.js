// const PaymentRecord = require('../../models/production-management/productionPaymentRecord');

// // Create a new payment record
// async function createPaymentRecord(data) {
//   const paymentRecord = new PaymentRecord(data);
//   return await paymentRecord.save();
// }

// // Get all payment records, optionally filtered
// async function getPaymentRecords(filter = {}) {
//   return await PaymentRecord.find(filter).sort({ date: -1 }); // newest first
// }

// // Get payment record by ID
// async function getPaymentRecordById(recordId) {
//   return await PaymentRecord.findById(recordId);
// }

// // Update an existing payment record
// async function updatePaymentRecord(recordId, update) {
//   return await PaymentRecord.findByIdAndUpdate(recordId, update, { new: true });
// }

// // Delete a payment record
// async function deletePaymentRecord(recordId) {
//   return await PaymentRecord.findByIdAndDelete(recordId);
// }

// module.exports = {
//   createPaymentRecord,
//   getPaymentRecords,
//   getPaymentRecordById,
//   updatePaymentRecord,
//   deletePaymentRecord,
// };

const path = require('path');
const fs = require('fs');
const PaymentRecord = require('../../models/production-management/productionPaymentRecord');
const { UPLOADS_DIR } = require('../../middleware/imageUploadMiddlware');
// Adjust this path if your image upload middleware lives elsewhere in the tree.
// const { UPLOADS_DIR } = require('../../middlewares/imageUpload');

// Remove a previously-uploaded photo from disk. Never throws — a missing/
// already-deleted file should not block the DB operation that triggered it.
function removePhotoFile(photoUpload) {
  if (!photoUpload) return;
  const filename = path.basename(photoUpload);
  const fullPath = path.join(UPLOADS_DIR, filename);
  fs.unlink(fullPath, (err) => {
    if (err && err.code !== 'ENOENT') {
      console.error(`Failed to remove payment record photo "${fullPath}":`, err.message);
    }
  });
}

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

// Update an existing payment record.
// If `update` carries a new photoUpload path, the previous photo (if any) is
// deleted from disk once the update succeeds.
async function updatePaymentRecord(recordId, update) {
  const shouldReplacePhoto = Object.prototype.hasOwnProperty.call(update, 'photoUpload');
  const existing = shouldReplacePhoto ? await PaymentRecord.findById(recordId) : null;

  const updated = await PaymentRecord.findByIdAndUpdate(recordId, update, { new: true });

  if (updated && shouldReplacePhoto && existing?.photoUpload && existing.photoUpload !== updated.photoUpload) {
    removePhotoFile(existing.photoUpload);
  }

  return updated;
}

// Delete a payment record (and its photo, if any, from disk)
async function deletePaymentRecord(recordId) {
  const deleted = await PaymentRecord.findByIdAndDelete(recordId);
  if (deleted?.photoUpload) {
    removePhotoFile(deleted.photoUpload);
  }
  return deleted;
}

module.exports = {
  createPaymentRecord,
  getPaymentRecords,
  getPaymentRecordById,
  updatePaymentRecord,
  deletePaymentRecord,
};