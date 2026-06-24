const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    fabricPartyName: {
      type: String,
      required: true,
      trim: true
    },
    recieverPartyName: {
      type: String,
      required: true,
      trim: true
    },
    length: {
      type: Number,
      required: true
    },
    MTR: {
      type: Number,
      required: true
    },
    Payment: {
      type: Number,
      required: true
    },
    challanNo: {
      type: String,
      required: true,
      trim: true,
      unique: true // Ensures challanNo is unique among all submissions collection-wide
    },
    challanPhotoPath: {
      type: String,
      required: true,
      trim: true
    },
    submitterName: {
      type: String,
      required: true,
      trim: true
    },
    // Added new field for enum warehouse/missing
    locationStatus: {
      type: String,
      enum: ['warehouse', 'missing'],
      required: true,
    }
  },
  { _id: false }
);

const subTaskSchema = new mongoose.Schema(
  {
    subTaskId: {
      type: String,
      required: false,
      trim: true
    },
    program: {
      type: String,
      required: false,
      trim: true
    },
    jigarNo: {
      type: String,
      required: false,
      trim: true
    },
    mtr: {
      type: Number,
      required: false
    },
    mtrShort: {
      type: Number,
      required: false
    },
    status: {
      type: String,
      required: false,
      trim: true,
      enum: ['pending', 'processing', 'done', 'partiallyDone'],
      default: 'pending'
    },
    remark: {
      type: String,
      required: false,
      trim: true
    },
    submission: {
      type: [submissionSchema],
      default: []
    }
  },
  { _id: false }
);

const taskRecordSchema = new mongoose.Schema(
  {
    taskId: {
      type: String,
      required: [true, 'Task ID is required'],
      unique: true,
      trim: true
    },
    challanNo: {
      type: String,
      required: false,
      trim: true
    },
    partyName: {
      type: String,
      required: false,
      trim: true
    },
    transportName: {
      type: String,
      required: false,
      trim: true
    },
    FabricType: {
      type: String,
      required: false,
      trim: true
    },
    Length: {
      type: Number,
      required: false
    },
    BuiltyNo: {
      type: String,
      required: false,
      trim: true
    },
    MTR: {
      type: Number,
      required: false
    },
    sinkage: {
      type: Number,
      required: false
    },
    mtrAfterSinkage: {
      type: Number,
      required: false
    },
    totalRolls: {
      type: Number,
      required: false
    },
    receiverName: {
      type: String,
      required: false,
      trim: true
    },
    remark: {
      type: String,
      required: false,
      trim: true
    },
    challanPhotoPath: {
      type: String,
      required: false,
      trim: true
    },
    taskStatus: {
      type: String,
      required: false,
      trim: true,
      enum: ['pending', 'processing', 'done', 'partiallyDone'],
      default: 'pending'
    },
    subTask: {
      type: [subTaskSchema],
      default: []
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('TaskRecord', taskRecordSchema);
