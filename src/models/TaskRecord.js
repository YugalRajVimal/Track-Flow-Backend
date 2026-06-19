const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    fabricPartyName: {
      type: String,
      required: false,
      trim: true
    },
    recieverPartyName: {
      type: String,
      required: false,
      trim: true
    },
    length: {
      type: Number,
      required: false
    },
    MTR: {
      type: Number,
      required: false
    },
    Payment: {
      type: Number,
      required: false
    },
    paymentStatus: {
      type: String,
      required: false,
      trim: true,
      enum: ['pending', 'paid', 'partial', 'unpaid'],
      default: 'pending'
    },
    challanNo: {
      type: String,
      required: false,
      trim: true
    },
    challanPhotoPath: {
      type: String,
      required: false,
      trim: true
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
      enum: ['pending', 'processing', 'done', 'partiallyDone'], // For consistency, same as main taskStatus
      default: 'pending'
    },
    remark: {
      type: String,
      required: false,
      trim: true
    },
    submission: {
      type: submissionSchema,
      default: {}
    }
  },
  { _id: false } // Prevents creation of separate _id for each subTask
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
