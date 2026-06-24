const mongoose = require('mongoose');

const PaymentDataSchema = new mongoose.Schema({
  receiverName: {
    type: [String],
    required: true,
    default: [],
  },
  senderName: {
    type: [String],
    required: true,
    default: [],
  },
  department: {
    type: [String],
    required: true,
    default: [],
  },
}, {
  timestamps: true
});

module.exports = mongoose.model('PaymentData', PaymentDataSchema);