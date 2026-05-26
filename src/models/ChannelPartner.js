const mongoose = require('mongoose');

const channelPartnerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Channel partner name is required'],
      trim: true,
      maxlength: [150, 'Name cannot exceed 150 characters'],
    },
    code: {
      type: String,
      required: [true, 'Channel partner code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChannelPartner', channelPartnerSchema);
