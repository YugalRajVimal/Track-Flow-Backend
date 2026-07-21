const mongoose = require('mongoose');

const DepartmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  senderNames: {
    type: [String],
    default: [],
    required: true,
  },
  receiverNames: {
    type: [String],
    default: [],
    required: true,
  }
}, { _id: false });

const PrintingPaymentDataSchema = new mongoose.Schema({
  departments: {
    type: [DepartmentSchema],
    required: true,
    default: [],
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PrintingPaymentData', PrintingPaymentDataSchema);