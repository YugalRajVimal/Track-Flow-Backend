const mongoose = require('mongoose');

const colorChemicalDropdownSchema = new mongoose.Schema({
  receiverName: [
    { type: String, trim: true, required: true }
  ],
  shopName: [
    { type: String, trim: true, required: true }
  ]
});

module.exports = mongoose.model('ColorChemicalDropdown', colorChemicalDropdownSchema);