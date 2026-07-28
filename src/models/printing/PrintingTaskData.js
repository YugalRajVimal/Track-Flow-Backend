const mongoose = require('mongoose');

// Schema for Printing Task Data dropdown and essential fields (all as arrays)

const printingTaskDataSchema = new mongoose.Schema(
  {
    // Implement a taskId counter via auto-increment
    taskIdCounter: {
      type: Number,
    },
    builtyIdCounter:{
      type: Number,
    },
    subTaskIdCounter: {
      type: Number,
    },
    partyName: [
      { type: String, trim: true, required: true }
    ],
    transportName: [
      { type: String, trim: true, required: true }
    ],
    fabricType: [
      { type: String, trim: true, required: true }
    ],
    length: [
      { type: Number, required: true }
    ],
    sinkage: [
      { type: Number, required: true }
    ],
    recieverName: [
      { type: String, trim: true, required: true }
    ],
    programName: [
      { type: String, trim: true, required: true }
    ],
    FabricPartyName: [
      { type: String, trim: true, required: true }
    ],
    recieverPartyName: [
      { type: String, trim: true, required: true }
    ],
    jigars: [
      { type: String, trim: true, required: false }
    ],
    submitterName: [
      { type: String, trim: true, required: true }
    ],
    dyerName: [
      { type: String, trim: true, required: true }
    ],
    // Added processName
    processName: [
      { type: String, trim: true, required: true }
    ],
    // Added silicateAndquiringName
    silicateAndquiringName: [
      { type: String, trim: true, required: true }
    ],
    // Added printType
    printType: [
      { type: String, trim: true, required: true }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('PrintingTaskData', printingTaskDataSchema);