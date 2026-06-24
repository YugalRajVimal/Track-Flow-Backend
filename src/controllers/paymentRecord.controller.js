const paymentRecordService = require('../services/paymentRecord.service');

// Create a new payment record
async function createPaymentRecord(req, res) {
  try {
    const paymentRecord = await paymentRecordService.createPaymentRecord(req.body);
    res.status(201).json({ data: paymentRecord, message: 'Payment record created successfully.' });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Failed to create payment record.' });
  }
}

// Get all payment records (optionally with filter via query params)
async function getPaymentRecords(req, res) {
  try {
    const filter = {};
    // Optionally, you can parse/filter more fields from req.query if needed.
    Object.keys(req.query).forEach(key => {
      // For date range you might need custom logic; for now, direct match
      filter[key] = req.query[key];
    });
    const records = await paymentRecordService.getPaymentRecords(filter);
    res.json({ data: records });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to get payment records.' });
  }
}

// Get a payment record by ID
async function getPaymentRecordById(req, res) {
  try {
    const recordId = req.params.id;
    const record = await paymentRecordService.getPaymentRecordById(recordId);
    if (!record) {
      return res.status(404).json({ message: 'Payment record not found.' });
    }
    res.json({ data: record });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to get payment record.' });
  }
}

// Update a payment record by ID
async function updatePaymentRecord(req, res) {
  try {
    const recordId = req.params.id;
    const update = req.body;
    const updated = await paymentRecordService.updatePaymentRecord(recordId, update);
    if (!updated) {
      return res.status(404).json({ message: 'Payment record not found.' });
    }
    res.json({ data: updated, message: 'Payment record updated successfully.' });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Failed to update payment record.' });
  }
}

// Delete a payment record by ID
async function deletePaymentRecord(req, res) {
  try {
    const recordId = req.params.id;
    const deleted = await paymentRecordService.deletePaymentRecord(recordId);
    if (!deleted) {
      return res.status(404).json({ message: 'Payment record not found.' });
    }
    res.json({ data: deleted, message: 'Payment record deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to delete payment record.' });
  }
}

module.exports = {
  createPaymentRecord,
  getPaymentRecords,
  getPaymentRecordById,
  updatePaymentRecord,
  deletePaymentRecord,
};