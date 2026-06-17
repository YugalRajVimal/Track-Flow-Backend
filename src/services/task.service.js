const TaskData = require('../models/TaskData');
const TaskRecord = require('../models/TaskRecord');


/**
 * Service to fetch taskDataSchema config fields from TaskData, e.g.,
 * partyName, transportName, fabricType, length, sinkage, recieverName
 * Returns a single document with those fields (assumes only one config doc)
 */
async function fetchTaskDataSchemaFields() {
  // Only fetch the relevant config fields
  const config = await TaskData.findOne({}, {
    partyName: 1,
    transportName: 1,
    fabricType: 1,
    length: 1,
    sinkage: 1,
    recieverName: 1,
    jigars:1,
    programName:1,
    FabricPartyName:1,
    recieverPartyName:1,
    _id: 0,
  });
  if (!config) throw new Error("Task data schema config not found");
  return config;
}




/**
 * Create one or multiple tasks.
 *
 * - Accepts:
 *   - groupData: { challanNo, partyName, transportName, receiverName, remark, challanPhotoPath }
 *   - taskDetails: array of objects [{ FabricType, Length, BuiltyNo, MTR, sinkage, mtrAfterSinkage, totalRolls, taskStatus }]
 *
 * - taskStatus must be one of: "pending", "processing", "done", "partiallyDone"
 * Returns created tasks.
 */
async function createTasks(groupData, taskDetails) {
  if (!Array.isArray(taskDetails) || taskDetails.length === 0) {
    throw new Error("taskDetails array is required");
  }

  // Allowed taskStatus values
  const allowedStatuses = ['pending', 'processing', 'done', 'partiallyDone'];

  // Get the TaskData document (assuming only one document containing taskIdCounter exists)
  let taskDataDoc = await TaskData.findOne();

  if (!taskDataDoc) {
    // If not exist, initialize (in production, guard against duplicates)
    taskDataDoc = await TaskData.create({ taskIdCounter: 1 });
  }
  let currentCounter = taskDataDoc.taskIdCounter || 1;

  // Prepare all new tasks, assign taskId and normalize taskStatus
  const newTasks = taskDetails.map(item => {
    let status = (item.taskStatus || 'pending');
    if (!allowedStatuses.includes(status)) {
      status = 'pending';
    }
    return {
      ...groupData,
      ...item,
      taskStatus: status,
      taskId: String(currentCounter++),
    };
  });

  // Bulk insert tasks
  const created = await TaskRecord.insertMany(newTasks);

  // Update the counter for next use
  taskDataDoc.taskIdCounter = currentCounter;
  await taskDataDoc.save();

  return created;
}

/**
 * Edit/Update a task by taskId.
 * Accepts: taskId (string), updateData (object)
 * - If taskStatus is provided, ensures it is one of: "pending", "processing", "done", "partiallyDone"
 */
async function editTask(taskId, updateData) {
  if (!taskId) throw new Error("taskId is required");
  const allowedStatuses = ['pending', 'processing', 'done', 'partiallyDone'];

  // Handle taskStatus normalization if present
  if (
    Object.prototype.hasOwnProperty.call(updateData, 'taskStatus') &&
    !allowedStatuses.includes(updateData.taskStatus)
  ) {
    updateData.taskStatus = 'pending';
  }

  const updated = await TaskRecord.findOneAndUpdate({ taskId }, updateData, { new: true });
  if (!updated) throw new Error("Task not found");
  return updated;
}

/**
 * Fetch tasks. 
 * - If taskId provided, return single. 
 * - Otherwise, support filter (partyName, transportName, etc)
 */
async function fetchTasks(filter = {}) {
  if (filter.taskId) {
    // Single fetch
    return await TaskRecord.findOne({ taskId: filter.taskId });
  }
  // Multi fetch (optionally, add pagination)
  return await TaskRecord.find(filter).sort({ createdAt: -1 });
}

/**
 * Fetch a task by its taskId.
 * Returns the TaskRecord if found, null otherwise.
 */
async function fetchByTaskId(taskId) {
  if (!taskId) throw new Error("taskId is required");
  return await TaskRecord.findOne({ taskId });
}


/**
 * Delete a task by taskId
 */
async function deleteTask(taskId) {
  if (!taskId) throw new Error("taskId is required");
  const deleted = await TaskRecord.findOneAndDelete({ taskId });
  if (!deleted) throw new Error("Task not found");
  return deleted;
}



/**
 * Add a subTask to a specific TaskRecord by taskId.
 * subTask must follow the subTaskSchema from TaskRecord.js
 * The sum of all subTask 'mtr' values (including the new one) must NOT exceed the Task's TotalMTR (MTR field).
 * Assigns an auto-incremented subTaskId from TaskData.subTaskIdCounter.
 */
async function addSubTask(taskId, subTask) {
  if (!taskId) throw new Error("taskId is required");
  if (!subTask) throw new Error("subTask object is required");

  // Fetch the TaskRecord first to get MTR and existing subTasks
  const taskRecord = await TaskRecord.findOne({ taskId });
  if (!taskRecord) throw new Error("Task not found");

  // Make sure MTR is present on Task
  const totalMTR = taskRecord.MTR;
  if (typeof totalMTR !== "number" || isNaN(totalMTR)) {
    throw new Error("TotalMTR (MTR) not defined on this task");
  }

  // Calculate total after adding new subTask
  const sumExistingMTR = (Array.isArray(taskRecord.subTask) ? taskRecord.subTask.reduce((acc, sub) => acc + (Number(sub.mtr) || 0), 0) : 0);
  const newSubTaskMTR = Number(subTask.mtr) || 0;
  if ((sumExistingMTR + newSubTaskMTR) > totalMTR) {
    throw new Error("Cannot add subTask: the sum of MTRs would exceed TotalMTR of the task");
  }

  // Fetch/update the subTaskId counter from TaskData (single document for counters)
  const TaskData = require('../models/TaskData');
  // Find or create the TaskData singleton doc
  let taskDataDoc = await TaskData.findOne();
  if (!taskDataDoc) {
    taskDataDoc = await TaskData.create({});
  }

  // Default beginning
  if (typeof taskDataDoc.subTaskIdCounter !== "number") {
    taskDataDoc.subTaskIdCounter = 1;
  }

  const newSubTaskId = taskDataDoc.subTaskIdCounter;
  taskDataDoc.subTaskIdCounter += 1;
  await taskDataDoc.save();

  // Add the subTaskId to the subTask object before pushing
  subTask.subTaskId = newSubTaskId;

  // Add subTask now
  taskRecord.subTask.push(subTask);
  await taskRecord.save();
  return taskRecord;
}

/**
 * Edit/update a single subTask of a TaskRecord, using its index in the subTask array.
 * Accepts: taskId (string), subTaskIndex (number), updateData (object)
 * The sum of all subTask 'mtr' values (with the edited one updated) must NOT exceed the Task's TotalMTR (MTR field).
 */
async function editSubTask(taskId, subTaskIndex, updateData) {
  if (!taskId) throw new Error("taskId is required");
  if (typeof subTaskIndex !== 'number') throw new Error("subTaskIndex is required and must be a number");

  const taskRecord = await TaskRecord.findOne({ taskId });
  if (!taskRecord) throw new Error("Task not found");

  if (!Array.isArray(taskRecord.subTask) || subTaskIndex < 0 || subTaskIndex >= taskRecord.subTask.length) {
    throw new Error("Invalid subTaskIndex");
  }

  // Make sure MTR is present on Task
  const totalMTR = taskRecord.MTR;
  if (typeof totalMTR !== "number" || isNaN(totalMTR)) {
    throw new Error("TotalMTR (MTR) not defined on this task");
  }

  // Calculate what the new sum would be if we update .mtr
  const existingSubTasks = taskRecord.subTask;
  let sumMTR = 0;
  for (let i = 0; i < existingSubTasks.length; i++) {
    if (i === subTaskIndex) {
      // Use the new mtr value if it's part of updateData, otherwise existing
      sumMTR += (updateData.hasOwnProperty('mtr') ? (Number(updateData.mtr) || 0) : (Number(existingSubTasks[i].mtr) || 0));
    } else {
      sumMTR += (Number(existingSubTasks[i].mtr) || 0);
    }
  }
  if (sumMTR > totalMTR) {
    throw new Error("Cannot update subTask: the sum of MTRs would exceed TotalMTR of the task");
  }

  Object.assign(taskRecord.subTask[subTaskIndex], updateData);
  await taskRecord.save();
  return taskRecord;
}

/**
 * Fetch subTasks for a specific TaskRecord by taskId.
 * If subTaskIndex is provided, returns only that subTask.
 */
async function fetchSubTasks(taskId, subTaskIndex = undefined) {
  if (!taskId) throw new Error("taskId is required");

  const taskRecord = await TaskRecord.findOne({ taskId });
  if (!taskRecord) throw new Error("Task not found");

  if (typeof subTaskIndex === 'number') {
    if (
      !Array.isArray(taskRecord.subTask) ||
      subTaskIndex < 0 ||
      subTaskIndex >= taskRecord.subTask.length
    ) {
      throw new Error("Invalid subTaskIndex");
    }
    return taskRecord.subTask[subTaskIndex];
  } else {
    return taskRecord.subTask;
  }
}

/**
 * Delete a subTask by index from the subTask array in TaskRecord.
 * Accepts: taskId (string), subTaskIndex (number)
 */
async function deleteSubTask(taskId, subTaskIndex) {
  if (!taskId) throw new Error("taskId is required");
  if (typeof subTaskIndex !== "number") throw new Error("subTaskIndex must be a number");

  const taskRecord = await TaskRecord.findOne({ taskId });
  if (!taskRecord) throw new Error("Task not found");

  if (!Array.isArray(taskRecord.subTask) || subTaskIndex < 0 || subTaskIndex >= taskRecord.subTask.length) {
    throw new Error("Invalid subTaskIndex");
  }

  taskRecord.subTask.splice(subTaskIndex, 1);
  await taskRecord.save();
  return taskRecord;
}


/**
 * Create (add) submission details for a subTask in a TaskRecord using taskId and subTaskId.
 * submissionData: object containing submission fields to store
 */
async function addSubmissionToSubTask(taskId, subTaskId, submissionData) {
  try {
    console.log('addSubmissionToSubTask called with:', { taskId, subTaskId, submissionData });
    if (!taskId) {
      console.log("Error: taskId is required");
      throw new Error("taskId is required");
    }
    if (!subTaskId) {
      console.log("Error: subTaskId is required");
      throw new Error("subTaskId is required");
    }

    const taskRecord = await TaskRecord.findOne({ taskId });
    if (!taskRecord) {
      console.log("Error: Task not found for taskId:", taskId);
      throw new Error("Task not found");
    }

    const subTask = taskRecord.subTask.find((s) => s.subTaskId === subTaskId);
    if (!subTask) {
      console.log("Error: SubTask not found for subTaskId:", subTaskId);
      throw new Error("SubTask not found");
    }

    subTask.submission = { ...submissionData };
    await taskRecord.save();
    console.log('Submission added/updated:', subTask.submission);
    return subTask.submission;
  } catch (error) {
    console.error('Error in addSubmissionToSubTask:', error);
    throw error;
  }
}

/**
 * Edit/update submission details for a subTask in a TaskRecord using taskId and subTaskId.
 * submissionData: object containing updated submission fields
 */
async function editSubmissionOfSubTask(taskId, subTaskId, submissionData) {
  // For now, same logic as add: upsert
  return addSubmissionToSubTask(taskId, subTaskId, submissionData);
}

/**
 * Fetch submission details for a subTask in a TaskRecord using taskId and subTaskId.
 * Returns the submission object or throws if not found.
 */
async function fetchSubmissionOfSubTask(taskId, subTaskId) {
  if (!taskId) throw new Error("taskId is required");
  if (!subTaskId) throw new Error("subTaskId is required");

  const taskRecord = await TaskRecord.findOne({ taskId });
  if (!taskRecord) throw new Error("Task not found");

  const subTask = taskRecord.subTask.find((s) => s.subTaskId === subTaskId);
  if (!subTask) throw new Error("SubTask not found");

  // May be undefined if not set yet
  return subTask.submission || {};
}

/**
 * Delete submission details from a subTask in a TaskRecord using taskId and subTaskId.
 * Returns the updated subTask after removing submission details.
 */
async function deleteSubmissionOfSubTask(taskId, subTaskId) {
  if (!taskId) throw new Error("taskId is required");
  if (!subTaskId) throw new Error("subTaskId is required");

  const taskRecord = await TaskRecord.findOne({ taskId });
  if (!taskRecord) throw new Error("Task not found");

  const subTask = taskRecord.subTask.find((s) => s.subTaskId === subTaskId);
  if (!subTask) throw new Error("SubTask not found");

  subTask.submission = {};
  await taskRecord.save();
  return subTask;
}


module.exports = {

    fetchTaskDataSchemaFields,
  createTasks,
  editTask,
  fetchTasks,
  fetchByTaskId,
  deleteTask,

  addSubTask,
  fetchSubTasks,
  editSubTask,
  deleteSubTask,

  addSubmissionToSubTask,
  editSubmissionOfSubTask,
  fetchSubmissionOfSubTask,
  deleteSubmissionOfSubTask
};
