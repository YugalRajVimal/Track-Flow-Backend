const mongoose = require('mongoose');

const rawMaterialInSchema = new mongoose.Schema(
  {
    recordId: {
      type: String,
      required: [true, 'Record ID is required'],
      unique: true,
      trim: true,
    },
    supplierName: { type: String, required: true, trim: true },
    items: { type: String, required: true, trim: true }, // e.g. Threads & Parts, Buttons, Press, Polybags, Portal Polybags, Rolls, or a custom "other" value
    amount: { type: Number, required: true, min: 0 },
    paymentMode: { type: String, enum: ['Cash', 'UPI', 'Due'], required: true },
    receiverName: { type: String, required: true, trim: true },
    chPhoto: { type: String, required: false, trim: true },
    remark: { type: String, required: false, trim: true },
    date: { type: Date, required: false, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RawMaterialIn', rawMaterialInSchema);
