// const mongoose = require('mongoose');
// const { Schema } = mongoose;

// const paymentRecordSchema = new Schema({
//   department: {
//     type: String,
//     required: true
//   },
//   type: {
//     type: String,
//     enum: ['recieve', 'sent'],
//     required: true
//   },
//   amount: {
//     type: Number,
//     required: true
//   },
//   date: {
//     type: Date,
//     required: true
//   },
//   paymentMethod: {
//     type: String,
//     required: true
//   },
//   recieverName: {
//     type: String,
//     required: true
//   },
//   senderName: {
//     type: String,
//     required: true
//   }
// });

// const ProductionPaymentRecord = mongoose.model('ProductionPaymentRecord', paymentRecordSchema);
// module.exports = ProductionPaymentRecord;
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
  },
  remark: {
    type: String,
    trim: true,
    default: ''
  },
  // Relative path (under the uploads dir) of the payment proof photo, e.g.
  // "uploads/receipt_1699999999999.jpg". Null/undefined when no photo attached.
  photoUpload: {
    type: String,
    default: null
  }
});

const ProductionPaymentRecord = mongoose.model('ProductionPaymentRecord', paymentRecordSchema);
module.exports = ProductionPaymentRecord;