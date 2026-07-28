const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    length: {
      type: Number,
      required: true
    },
    MTR: {
      type: Number,
      required: true
    },
    challanNo: {
      type: String,
      required: true,
      trim: true,
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
    locationStatus: {
      type: String,
      enum: ['warehouse', 'missing'],
      required: true,
    },
    // Add recieverPartyName in submission
    recieverPartyName: {
      type: String,
      required: false,
      trim: true
    },
    // Add date field to submission
    date: {
      type: Date,
      required: false,
      default: null
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
    challanNo: {
      type: String,
      required: false,
      trim: true
    },
    silicateOrQuiringName: {
      type: String,
      required: false,
      trim: true
    },
    sinkage: {
      type: Number,
      required: false
    },
    challanPhoto: {
      type: String,
      required: false,
      trim: true
    },
    printType: {
      type: String,
      required: false,
      trim: true
    },
    mtr: {
      type: Number,
      required: false
    },
    submission: {
      type: [submissionSchema],
      default: []
    },
    // Add date field to subTask
    date: {
      type: Date,
      required: false,
      default: null
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
    dyerSinkage: {
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
    // Added dyerName field in Task
    dyerName: {
      type: String,
      required: false,
      trim: true
    },
    // Added processName field in Task
    processName: {
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
    subTask: {
      type: [subTaskSchema],
      default: []
    },
    // NEW: distinguishes Ready Fabric vs Builty In workflow
    taskType: {
      type: String,
      enum: ['ReadyFabric', 'BuiltyIn'],
      required: true,
      default: 'BuiltyIn',
      trim: true
    },
    // Add date field to task
    date: {
      type: Date,
      required: false,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PrintingTaskRecord', taskRecordSchema);
