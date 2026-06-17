const mongoose = require('mongoose');

// Schema for Task Data dropdown and essential fields (all as arrays)

const taskDataSchema = new mongoose.Schema(
  {
    // Implement a taskId counter via auto-increment
    taskIdCounter: {
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
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('TaskData', taskDataSchema);