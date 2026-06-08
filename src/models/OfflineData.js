const mongoose = require('mongoose');

// Schema for dropdown values (StyleType, SalesMan, PartyName) for Offline records

const offlineDropdownSchema = new mongoose.Schema(
  {
    styleTypes: [
      {
        name: { type: String, trim: true, required: true }
      }
    ],
    salesMen: [
      {
        name: { type: String, trim: true, required: true }
      }
    ],
    partyNames: [
      {
        name: { type: String, trim: true, required: true }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('OfflineDropdown', offlineDropdownSchema);