
// OfflineRecords.js (1-8)
/**
Party name
Ch. No.
Style Type (Gown, St. Top, Gathered Top, etc.)
Qty
Total Qty
Payment (CASH/DUE/UPI)
Remark
*/

const mongoose = require('mongoose');

const offlineRecordSchema = new mongoose.Schema(
  {
    partyName: {
      type: String,
      required: [true, 'Party name is required'],
      trim: true,
      maxlength: [100, 'Party name cannot exceed 100 characters'],
    },
    challanNo: {
      type: String,
      required: [true, 'Challan number is required'],
      trim: true,
      maxlength: [40, 'Challan number cannot exceed 40 characters'],
    },
    styleType: {
      type: String,
      required: [true, 'Style Type is required'],
      trim: true,
      maxlength: [80, 'Style Type cannot exceed 80 characters'],
    },
    qty: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Qty must be at least 1'],
    },
    totalQty: {
      type: Number,
      required: [true, 'Total quantity is required'],
      min: [1, 'Total Qty must be at least 1'],
    },
    payment: {
      type: String,
      enum: ['CASH', 'DUE', 'UPI'],
      required: [true, 'Payment method is required'],
      uppercase: true,
      trim: true,
    },
    remark: {
      type: String,
      trim: true,
      maxlength: [200, 'Remark cannot exceed 200 characters'],
    }
  },
  { timestamps: true }
);

offlineRecordSchema.index({ createdAt: -1 });

module.exports = mongoose.model('OfflineRecord', offlineRecordSchema);
