const mongoose = require('mongoose');

const awbRecordSchema = new mongoose.Schema(
  {
    awbId: {
      type: String,
      required: [true, 'AWB ID is required'],
      unique: true,
      trim: true,
      match: [/^[a-zA-Z0-9]+$/, 'AWB ID must be alphanumeric'],
      minlength: [6, 'AWB ID must be at least 6 characters'],
      maxlength: [30, 'AWB ID cannot exceed 30 characters'],
    },
    channelPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChannelPartner',
      required: [true, 'Channel partner is required'],
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      required: [true, 'Brand is required'],
    },
    status: {
      type: String,
      enum: ['dispatched', 'cancelled'],
      default: 'dispatched',
    },
    scannedAt: {
      type: Date,
      default: Date.now,
    },
    cancelledAt: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Index for efficient date-based queries
awbRecordSchema.index({ createdAt: -1 });
awbRecordSchema.index({ channelPartner: 1, brand: 1 });
awbRecordSchema.index({ status: 1 });
// awbId already has unique: true which creates an index automatically

module.exports = mongoose.model('AWBRecord', awbRecordSchema);
