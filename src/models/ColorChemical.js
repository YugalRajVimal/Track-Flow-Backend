const mongoose = require('mongoose');

const ColorChemicalSchema = new mongoose.Schema({
  challanNo: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  shopName: {
    type: String,
    required: true,
    trim: true
  },
  challanPhotoUpload: {
    type: String, // You might store the file path or URL as a string
    required: true
  },
  Amount: {
    type: Number,
    required: false
  },
  receiverName: {
    type: String,
    required: true,
    trim: true
  },
  remark: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ColorChemical', ColorChemicalSchema);