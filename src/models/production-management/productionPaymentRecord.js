const mongoose = require('mongoose');
const { Schema } = mongoose;

const paymentRecordSchema = new Schema({
  department: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['recieve', 'sent'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  paymentMethod: {
    type: String,
    required: true
  },
  recieverName: {
    type: String,
    required: true
  },
  senderName: {
    type: String,
    required: true
  }
});

const ProductionPaymentRecord = mongoose.model('ProductionPaymentRecord', paymentRecordSchema);
module.exports = ProductionPaymentRecord;