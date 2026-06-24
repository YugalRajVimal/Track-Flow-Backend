// const TaskData = require('../models/TaskData');
// const TaskRecord = require('../models/TaskRecord');


// /**
//  * Service to fetch taskDataSchema config fields from TaskData, e.g.,
//  * partyName, transportName, fabricType, length, sinkage, recieverName
//  * Returns a single document with those fields (assumes only one config doc)
//  */
// async function fetchTaskDataSchemaFields() {
//   // Only fetch the relevant config fields
//   const config = await TaskData.findOne({}, {
//     partyName: 1,
//     transportName: 1,
//     fabricType: 1,
//     length: 1,
//     sinkage: 1,
//     recieverName: 1,
//     jigars:1,
//     programName:1,
//     FabricPartyName:1,
//     recieverPartyName:1,
//     _id: 0,
//   });
//   if (!config) throw new Error("Task data schema config not found");
//   return config;
// }




// /**
//  * Create one or multiple tasks.
//  *
//  * - Accepts:
//  *   - groupData: { challanNo, partyName, transportName, receiverName, remark, challanPhotoPath }
//  *   - taskDetails: array of objects [{ FabricType, Length, BuiltyNo, MTR, sinkage, mtrAfterSinkage, totalRolls, taskStatus }]
//  *
//  * - taskStatus must be one of: "pending", "processing", "done", "partiallyDone"
//  * Returns created tasks.
//  *
//  * - taskId: Combination of sanitized partyName and counter (e.g. {partyName}-{counter})
//  */
// async function createTasks(groupData, taskDetails) {
//   if (!Array.isArray(taskDetails) || taskDetails.length === 0) {
//     throw new Error("taskDetails array is required");
//   }

//   // Allowed taskStatus values
//   const allowedStatuses = ['pending', 'processing', 'done', 'partiallyDone'];

//   // Get the TaskData document (assuming only one document containing taskIdCounter exists)
//   let taskDataDoc = await TaskData.findOne();

//   if (!taskDataDoc) {
//     // If not exist, initialize (in production, guard against duplicates)
//     taskDataDoc = await TaskData.create({ taskIdCounter: 1 });
//   }
//   let currentCounter = taskDataDoc.taskIdCounter || 1;

//   // Get the partyName from groupData (fallback to blank if missing)
//   const rawPartyName = groupData.partyName || "";
//   // Make a safe, slug-like string: all uppercase, remove spaces & special chars
//   const sanitizedPartyName = rawPartyName
//     .toString()
//     .trim()
//     .toUpperCase()
//     .replace(/\s+/g, "_")
//     .replace(/[^A-Z0-9_]/g, "");

//   // Prepare all new tasks, assign taskId and normalize taskStatus
//   const newTasks = taskDetails.map(item => {
//     let status = (item.taskStatus || 'pending');
//     if (!allowedStatuses.includes(status)) {
//       status = 'pending';
//     }
//     // taskId: {sanitizedPartyName}-{counter}
//     const taskId = sanitizedPartyName
//       ? `${sanitizedPartyName}-${currentCounter++}`
//       : `${currentCounter++}`;
//     return {
//       ...groupData,
//       ...item,
//       taskStatus: status,
//       taskId,
//     };
//   });

//   // Bulk insert tasks
//   const created = await TaskRecord.insertMany(newTasks);

//   // Update the counter for next use
//   taskDataDoc.taskIdCounter = currentCounter;
//   await taskDataDoc.save();

//   return created;
// }

// /**
//  * Edit/Update a task by taskId.
//  * Accepts: taskId (string), updateData (object)
//  * - If taskStatus is provided, ensures it is one of: "pending", "processing", "done", "partiallyDone"
//  */
// async function editTask(taskId, updateData) {
//   if (!taskId) throw new Error("taskId is required");
//   const allowedStatuses = ['pending', 'processing', 'done', 'partiallyDone'];

//   // Handle taskStatus normalization if present
//   if (
//     Object.prototype.hasOwnProperty.call(updateData, 'taskStatus') &&
//     !allowedStatuses.includes(updateData.taskStatus)
//   ) {
//     updateData.taskStatus = 'pending';
//   }

//   const updated = await TaskRecord.findOneAndUpdate({ taskId }, updateData, { new: true });
//   if (!updated) throw new Error("Task not found");
//   return updated;
// }

// /**
//  * Fetch tasks. 
//  * - If taskId provided, return single. 
//  * - Otherwise, support filter (partyName, transportName, etc)
//  */
// async function fetchTasks(filter = {}) {
//   if (filter.taskId) {
//     // Single fetch
//     return await TaskRecord.findOne({ taskId: filter.taskId });
//   }
//   // Multi fetch (optionally, add pagination)
//   return await TaskRecord.find(filter).sort({ createdAt: -1 });
// }

// /**
//  * Fetch a task by its taskId.
//  * Returns the TaskRecord if found, null otherwise.
//  */
// async function fetchByTaskId(taskId) {
//   if (!taskId) throw new Error("taskId is required");
//   return await TaskRecord.findOne({ taskId });
// }

// /**
//  * Fetch all Tasks which have at least one subTask with 'pending' status.
//  * Returns an array of TaskRecords, each with subTasks.
//  */
// async function fetchTasksWithPendingSubTasks() {
//   // Find all tasks where subTask.status == 'pending' for at least one subTask
//   // (matches at least one subTask with status 'pending')
//   return await TaskRecord.find({ 'subTask.status': 'pending' }).sort({ createdAt: -1 });
// }



// /**
//  * Delete a task by taskId
//  */
// async function deleteTask(taskId) {
//   if (!taskId) throw new Error("taskId is required");
//   const deleted = await TaskRecord.findOneAndDelete({ taskId });
//   if (!deleted) throw new Error("Task not found");
//   return deleted;
// }



// /**
//  * Add a subTask to a specific TaskRecord by taskId.
//  * subTask must follow the subTaskSchema from TaskRecord.js
//  * The sum of all subTask 'mtr' values (including the new one) must NOT exceed the Task's TotalMTR (MTR field).
//  * Assigns an auto-incremented subTaskId from TaskData.subTaskIdCounter in the format ${taskId}-S-${counter}.
//  */
// async function addSubTask(taskId, subTask) {
//   if (!taskId) throw new Error("taskId is required");
//   if (!subTask) throw new Error("subTask object is required");

//   // Fetch the TaskRecord first to get MTR and existing subTasks
//   const taskRecord = await TaskRecord.findOne({ taskId });
//   if (!taskRecord) throw new Error("Task not found");

//   // Make sure MTR is present on Task
//   const totalMTR = taskRecord.MTR;
//   if (typeof totalMTR !== "number" || isNaN(totalMTR)) {
//     throw new Error("TotalMTR (MTR) not defined on this task");
//   }

//   // Calculate total after adding new subTask
//   const sumExistingMTR = (Array.isArray(taskRecord.subTask) ? taskRecord.subTask.reduce((acc, sub) => acc + (Number(sub.mtr) || 0), 0) : 0);
//   const newSubTaskMTR = Number(subTask.mtr) || 0;
//   if ((sumExistingMTR + newSubTaskMTR) > totalMTR) {
//     throw new Error("Cannot add subTask: the sum of MTRs would exceed TotalMTR of the task");
//   }

//   // Fetch/update the subTaskId counter from TaskData (single document for counters)
//   const TaskData = require('../models/TaskData');
//   // Find or create the TaskData singleton doc
//   let taskDataDoc = await TaskData.findOne();
//   if (!taskDataDoc) {
//     taskDataDoc = await TaskData.create({});
//   }

//   // Default beginning
//   if (typeof taskDataDoc.subTaskIdCounter !== "number") {
//     taskDataDoc.subTaskIdCounter = 1;
//   }

//   const newSubTaskCounter = taskDataDoc.subTaskIdCounter;
//   taskDataDoc.subTaskIdCounter += 1;
//   await taskDataDoc.save();

//   // Set subTaskId in the format `${taskId}-S-${counter}`
//   subTask.subTaskId = `${taskId}-S-${newSubTaskCounter}`;

//   // Add subTask now
//   taskRecord.subTask.push(subTask);
//   await taskRecord.save();
//   return taskRecord;
// }

// /**
//  * Edit/update a single subTask of a TaskRecord, using its index in the subTask array.
//  * Accepts: taskId (string), subTaskIndex (number), updateData (object)
//  * The sum of all subTask 'mtr' values (with the edited one updated) must NOT exceed the Task's TotalMTR (MTR field).
//  */
// async function editSubTask(taskId, subTaskIndex, updateData) {
//   if (!taskId) throw new Error("taskId is required");
//   if (typeof subTaskIndex !== 'number') throw new Error("subTaskIndex is required and must be a number");

//   const taskRecord = await TaskRecord.findOne({ taskId });
//   if (!taskRecord) throw new Error("Task not found");

//   if (!Array.isArray(taskRecord.subTask) || subTaskIndex < 0 || subTaskIndex >= taskRecord.subTask.length) {
//     throw new Error("Invalid subTaskIndex");
//   }

//   // Make sure MTR is present on Task
//   const totalMTR = taskRecord.MTR;
//   if (typeof totalMTR !== "number" || isNaN(totalMTR)) {
//     throw new Error("TotalMTR (MTR) not defined on this task");
//   }

//   // Calculate what the new sum would be if we update .mtr
//   const existingSubTasks = taskRecord.subTask;
//   let sumMTR = 0;
//   for (let i = 0; i < existingSubTasks.length; i++) {
//     if (i === subTaskIndex) {
//       // Use the new mtr value if it's part of updateData, otherwise existing
//       sumMTR += (updateData.hasOwnProperty('mtr') ? (Number(updateData.mtr) || 0) : (Number(existingSubTasks[i].mtr) || 0));
//     } else {
//       sumMTR += (Number(existingSubTasks[i].mtr) || 0);
//     }
//   }
//   if (sumMTR > totalMTR) {
//     throw new Error("Cannot update subTask: the sum of MTRs would exceed TotalMTR of the task");
//   }

//   Object.assign(taskRecord.subTask[subTaskIndex], updateData);
//   await taskRecord.save();
//   return taskRecord;
// }

// /**
//  * Fetch subTasks for a specific TaskRecord by taskId.
//  * If subTaskIndex is provided, returns only that subTask.
//  */
// async function fetchSubTasks(taskId, subTaskIndex = undefined) {
//   if (!taskId) throw new Error("taskId is required");

//   const taskRecord = await TaskRecord.findOne({ taskId });
//   if (!taskRecord) throw new Error("Task not found");

//   if (typeof subTaskIndex === 'number') {
//     if (
//       !Array.isArray(taskRecord.subTask) ||
//       subTaskIndex < 0 ||
//       subTaskIndex >= taskRecord.subTask.length
//     ) {
//       throw new Error("Invalid subTaskIndex");
//     }
//     return taskRecord.subTask[subTaskIndex];
//   } else {
//     return taskRecord.subTask;
//   }
// }

// /**
//  * Delete a subTask by index from the subTask array in TaskRecord.
//  * Accepts: taskId (string), subTaskIndex (number)
//  */
// async function deleteSubTask(taskId, subTaskIndex) {
//   if (!taskId) throw new Error("taskId is required");
//   if (typeof subTaskIndex !== "number") throw new Error("subTaskIndex must be a number");

//   const taskRecord = await TaskRecord.findOne({ taskId });
//   if (!taskRecord) throw new Error("Task not found");

//   if (!Array.isArray(taskRecord.subTask) || subTaskIndex < 0 || subTaskIndex >= taskRecord.subTask.length) {
//     throw new Error("Invalid subTaskIndex");
//   }

//   taskRecord.subTask.splice(subTaskIndex, 1);
//   await taskRecord.save();
//   return taskRecord;
// }


// /**
//  * Create (add) submission details for a subTask in a TaskRecord using taskId and subTaskId.
//  * All fields in the submission are mandatory, paymentStatus is removed.
//  * submitterName is mandatory. challanNo must be unique across all submissions.
//  * Handles uploaded image path from req.file if available.
//  * 
//  * submissionData: object containing all required submission fields
//  * imageFile: Express multer file object if provided (optional)
//  */
// async function addSubmissionToSubTask(taskId, subTaskId, submissionData, imageFile = null) {
//   try {
//     console.log('addSubmissionToSubTask called with:', { taskId, subTaskId, submissionData, hasImage: !!imageFile });

//     if (!taskId) throw new Error("taskId is required");
//     if (!subTaskId) throw new Error("subTaskId is required");

//     // All submission fields must be present and not undefined/null
//     const requiredFields = [
//       'fabricPartyName',
//       'recieverPartyName',
//       'length',
//       'MTR',
//       'Payment',
//       'challanNo',
//       'submitterName'
//     ];
//     for (const field of requiredFields) {
//       if (
//         typeof submissionData[field] === 'undefined' ||
//         submissionData[field] === null ||
//         (typeof submissionData[field] === 'string' && submissionData[field].trim() === '')
//       ) {
//         throw new Error(`${field} is required for submission`);
//       }
//     }

//     // Check unique challanNo across all submissions in all subTasks
//     const taskRecord = await TaskRecord.findOne({ taskId });
//     if (!taskRecord) throw new Error("Task not found");

//     for (const st of taskRecord.subTask || []) {
//       for (const sub of Array.isArray(st.submission) ? st.submission : []) {
//         if (sub.challanNo === submissionData.challanNo) {
//           throw new Error("challanNo must be unique among all submissions in this TaskRecord");
//         }
//       }
//     }

//     const subTask = taskRecord.subTask.find((s) => s.subTaskId === subTaskId);
//     if (!subTask) throw new Error("SubTask not found");

//     // Prepare the challanPhotoPath from file if present
//     let challanPhotoPath = submissionData.challanPhotoPath;
//     // if (imageFile) {
//     //   challanPhotoPath = `/uploads/${imageFile.originalname}`;
//     // }

//     const submission = {
//       fabricPartyName: submissionData.fabricPartyName,
//       recieverPartyName: submissionData.recieverPartyName,
//       length: submissionData.length,
//       MTR: submissionData.MTR,
//       Payment: submissionData.Payment,
//       challanNo: submissionData.challanNo,
//       challanPhotoPath,
//       submitterName: submissionData.submitterName
//     };

//     if (!Array.isArray(subTask.submission)) {
//       subTask.submission = [];
//     }
//     subTask.submission.push(submission);

//     await taskRecord.save();

//     console.log('Submission added, with challanPhotoPath:', submission.challanPhotoPath);

//     return submission; // Return the last added submission
//   } catch (error) {
//     console.error('Error in addSubmissionToSubTask:', error);
//     throw error;
//   }
// }

// /**
//  * Edit (update) an existing submission for a subTask in a TaskRecord using taskId, subTaskId and submissionIndex.
//  * All fields in the submission are mandatory, paymentStatus is removed.
//  * submitterName is mandatory. challanNo must be unique across all submissions except for itself.
//  *
//  * submissionIndex: index of the submission to edit in the array (required)
//  * submissionData: object containing updated submission fields
//  * imageFile: Express multer file object if provided (optional)
//  */
// async function editSubmissionOfSubTask(taskId, subTaskId, submissionIndex, submissionData, imageFile = null) {
//   try {
//     if (!taskId) throw new Error("taskId is required");
//     if (!subTaskId) throw new Error("subTaskId is required");
//     if (typeof submissionIndex !== "number") throw new Error("submissionIndex is required and must be a number");

//     // All submission fields must be present and not undefined/null
//     const requiredFields = [
//       'fabricPartyName',
//       'recieverPartyName',
//       'length',
//       'MTR',
//       'Payment',
//       'challanNo',
//       'submitterName'
//     ];
//     for (const field of requiredFields) {
//       if (
//         typeof submissionData[field] === 'undefined' ||
//         submissionData[field] === null ||
//         (typeof submissionData[field] === 'string' && submissionData[field].trim() === '')
//       ) {
//         throw new Error(`${field} is required for submission`);
//       }
//     }

//     const taskRecord = await TaskRecord.findOne({ taskId });
//     if (!taskRecord) throw new Error("Task not found");

//     const subTask = taskRecord.subTask.find((s) => s.subTaskId === subTaskId);
//     if (!subTask) throw new Error("SubTask not found");

//     if (!Array.isArray(subTask.submission) || submissionIndex < 0 || submissionIndex >= subTask.submission.length) {
//       throw new Error("Invalid submissionIndex");
//     }

//     // Check unique challanNo across all submissions in all subTasks, except itself
//     for (const st of taskRecord.subTask || []) {
//       for (const [idx, sub] of (Array.isArray(st.submission) ? st.submission.entries() : [])) {
//         if (
//           sub.challanNo === submissionData.challanNo &&
//           !(st.subTaskId === subTaskId && idx === submissionIndex)
//         ) {
//           throw new Error("challanNo must be unique among all submissions in this TaskRecord");
//         }
//       }
//     }

//     let challanPhotoPath = submissionData.challanPhotoPath;
//     // if (imageFile) {
//     //   challanPhotoPath = `/uploads/${imageFile.originalname}`;
//     // }

//     const updatedSubmission = {
//       fabricPartyName: submissionData.fabricPartyName,
//       recieverPartyName: submissionData.recieverPartyName,
//       length: submissionData.length,
//       MTR: submissionData.MTR,
//       Payment: submissionData.Payment,
//       challanNo: submissionData.challanNo,
//       challanPhotoPath,
//       submitterName: submissionData.submitterName
//     };

//     // Replace the specific submission at submissionIndex
//     subTask.submission[submissionIndex] = updatedSubmission;

//     await taskRecord.save();

//     return updatedSubmission;
//   } catch (error) {
//     console.error('Error in editSubmissionOfSubTask:', error);
//     throw error;
//   }
// }

// /**
//  * Delete a specific submission entry from a subTask in a TaskRecord using taskId, subTaskId and submissionIndex.
//  * Returns the updated subTask after removing the submission at the specified index.
//  */
// async function deleteSubmissionOfSubTask(taskId, subTaskId, submissionIndex) {
//   if (!taskId) throw new Error("taskId is required");
//   if (!subTaskId) throw new Error("subTaskId is required");
//   if (typeof submissionIndex !== "number") throw new Error("submissionIndex is required and must be a number");

//   const taskRecord = await TaskRecord.findOne({ taskId });
//   if (!taskRecord) throw new Error("Task not found");

//   const subTask = taskRecord.subTask.find((s) => s.subTaskId === subTaskId);
//   if (!subTask) throw new Error("SubTask not found");

//   if (!Array.isArray(subTask.submission) || submissionIndex < 0 || submissionIndex >= subTask.submission.length) {
//     throw new Error("Invalid submissionIndex");
//   }

//   subTask.submission.splice(submissionIndex, 1);
//   await taskRecord.save();
//   return subTask;
// }

// /**
//  * Fetch all submission details (array) for a subTask in a TaskRecord using taskId and subTaskId.
//  * Optionally, provide a submissionIndex to fetch one specific submission in the array.
//  * Returns the submission array/object or throws if not found.
//  */
// async function fetchSubmissionOfSubTask(taskId, subTaskId, submissionIndex = undefined) {
//   if (!taskId) throw new Error("taskId is required");
//   if (!subTaskId) throw new Error("subTaskId is required");

//   const taskRecord = await TaskRecord.findOne({ taskId });
//   if (!taskRecord) throw new Error("Task not found");

//   const subTask = taskRecord.subTask.find((s) => s.subTaskId === subTaskId);
//   if (!subTask) throw new Error("SubTask not found");

//   if (!Array.isArray(subTask.submission)) {
//     return [];
//   }
//   if (typeof submissionIndex === 'number') {
//     if (submissionIndex < 0 || submissionIndex >= subTask.submission.length) {
//       throw new Error("Invalid submissionIndex");
//     }
//     return subTask.submission[submissionIndex];
//   }
//   return subTask.submission;
// }




// module.exports = {

//     fetchTaskDataSchemaFields,
//   createTasks,
//   editTask,
//   fetchTasks,
//   fetchByTaskId,
//   deleteTask,

//   fetchTasksWithPendingSubTasks,

//   addSubTask,
//   fetchSubTasks,
//   editSubTask,
//   deleteSubTask,

//   addSubmissionToSubTask,
//   editSubmissionOfSubTask,
//   fetchSubmissionOfSubTask,
//   deleteSubmissionOfSubTask
// };


const TaskData = require('../models/TaskData');
const TaskRecord = require('../models/TaskRecord');


/**
 * Service to fetch taskDataSchema config fields from TaskData.
 */
async function fetchTaskDataSchemaFields() {
  const config = await TaskData.findOne({}, {
    partyName: 1,
    transportName: 1,
    fabricType: 1,
    length: 1,
    sinkage: 1,
    recieverName: 1,
    jigars: 1,
    programName: 1,
    FabricPartyName: 1,
    recieverPartyName: 1,
    _id: 0,
  });
  if (!config) throw new Error('Task data schema config not found');
  return config;
}


/**
 * Create one or multiple tasks.
 */
async function createTasks(groupData, taskDetails) {
  if (!Array.isArray(taskDetails) || taskDetails.length === 0) {
    throw new Error('taskDetails array is required');
  }

  const allowedStatuses = ['pending', 'processing', 'done', 'partiallyDone'];

  let taskDataDoc = await TaskData.findOne();
  if (!taskDataDoc) {
    taskDataDoc = await TaskData.create({ taskIdCounter: 1 });
  }
  let currentCounter = taskDataDoc.taskIdCounter || 1;

  const rawPartyName = groupData.partyName || '';
  const sanitizedPartyName = rawPartyName
    .toString().trim().toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '');

  const newTasks = taskDetails.map(item => {
    let status = item.taskStatus || 'pending';
    if (!allowedStatuses.includes(status)) status = 'pending';
    const taskId = sanitizedPartyName
      ? `${sanitizedPartyName}-${currentCounter++}`
      : `${currentCounter++}`;
    return { ...groupData, ...item, taskStatus: status, taskId };
  });

  const created = await TaskRecord.insertMany(newTasks);
  taskDataDoc.taskIdCounter = currentCounter;
  await taskDataDoc.save();
  return created;
}


/**
 * Edit/Update a task by taskId.
 */
async function editTask(taskId, updateData) {
  if (!taskId) throw new Error('taskId is required');
  const allowedStatuses = ['pending', 'processing', 'done', 'partiallyDone'];
  if (
    Object.prototype.hasOwnProperty.call(updateData, 'taskStatus') &&
    !allowedStatuses.includes(updateData.taskStatus)
  ) {
    updateData.taskStatus = 'pending';
  }
  const updated = await TaskRecord.findOneAndUpdate({ taskId }, updateData, { new: true });
  if (!updated) throw new Error('Task not found');
  return updated;
}


/**
 * Fetch tasks (single by taskId or multiple with filter).
 */
async function fetchTasks(filter = {}) {
  if (filter.taskId) return await TaskRecord.findOne({ taskId: filter.taskId });
  return await TaskRecord.find(filter).sort({ createdAt: -1 });
}


/**
 * Fetch a task by its taskId.
 */
async function fetchByTaskId(taskId) {
  if (!taskId) throw new Error('taskId is required');
  return await TaskRecord.findOne({ taskId });
}


/**
 * Fetch all tasks which have at least one subTask with 'pending' status.
 */
async function fetchTasksWithPendingSubTasks() {
  return await TaskRecord.find({ 'subTask.status': 'pending' }).sort({ createdAt: -1 });
}


/**
 * Delete a task by taskId.
 */
async function deleteTask(taskId) {
  if (!taskId) throw new Error('taskId is required');
  const deleted = await TaskRecord.findOneAndDelete({ taskId });
  if (!deleted) throw new Error('Task not found');
  return deleted;
}


/**
 * Add a subTask to a specific TaskRecord by taskId.
 */
async function addSubTask(taskId, subTask) {
  if (!taskId) throw new Error('taskId is required');
  if (!subTask) throw new Error('subTask object is required');

  const taskRecord = await TaskRecord.findOne({ taskId });
  if (!taskRecord) throw new Error('Task not found');

  const totalMTR = taskRecord.MTR;
  if (typeof totalMTR !== 'number' || isNaN(totalMTR)) {
    throw new Error('TotalMTR (MTR) not defined on this task');
  }

  const sumExistingMTR = Array.isArray(taskRecord.subTask)
    ? taskRecord.subTask.reduce((acc, sub) => acc + (Number(sub.mtr) || 0), 0)
    : 0;
  const newSubTaskMTR = Number(subTask.mtr) || 0;
  if ((sumExistingMTR + newSubTaskMTR) > totalMTR) {
    throw new Error('Cannot add subTask: the sum of MTRs would exceed TotalMTR of the task');
  }

  let taskDataDoc = await TaskData.findOne();
  if (!taskDataDoc) taskDataDoc = await TaskData.create({});
  if (typeof taskDataDoc.subTaskIdCounter !== 'number') taskDataDoc.subTaskIdCounter = 1;

  const newSubTaskCounter = taskDataDoc.subTaskIdCounter;
  taskDataDoc.subTaskIdCounter += 1;
  await taskDataDoc.save();

  subTask.subTaskId = `${taskId}-S-${newSubTaskCounter}`;
  taskRecord.subTask.push(subTask);
  await taskRecord.save();
  return taskRecord;
}


/**
 * Edit/update a single subTask of a TaskRecord.
 */
async function editSubTask(taskId, subTaskIndex, updateData) {
  if (!taskId) throw new Error('taskId is required');
  if (typeof subTaskIndex !== 'number') throw new Error('subTaskIndex is required and must be a number');

  const taskRecord = await TaskRecord.findOne({ taskId });
  if (!taskRecord) throw new Error('Task not found');

  if (!Array.isArray(taskRecord.subTask) || subTaskIndex < 0 || subTaskIndex >= taskRecord.subTask.length) {
    throw new Error('Invalid subTaskIndex');
  }

  const totalMTR = taskRecord.MTR;
  if (typeof totalMTR !== 'number' || isNaN(totalMTR)) {
    throw new Error('TotalMTR (MTR) not defined on this task');
  }

  let sumMTR = 0;
  for (let i = 0; i < taskRecord.subTask.length; i++) {
    sumMTR += i === subTaskIndex
      ? (updateData.hasOwnProperty('mtr') ? (Number(updateData.mtr) || 0) : (Number(taskRecord.subTask[i].mtr) || 0))
      : (Number(taskRecord.subTask[i].mtr) || 0);
  }
  if (sumMTR > totalMTR) {
    throw new Error('Cannot update subTask: the sum of MTRs would exceed TotalMTR of the task');
  }

  Object.assign(taskRecord.subTask[subTaskIndex], updateData);
  await taskRecord.save();
  return taskRecord;
}


/**
 * Fetch subTasks for a specific TaskRecord.
 */
async function fetchSubTasks(taskId, subTaskIndex = undefined) {
  if (!taskId) throw new Error('taskId is required');
  const taskRecord = await TaskRecord.findOne({ taskId });
  if (!taskRecord) throw new Error('Task not found');

  if (typeof subTaskIndex === 'number') {
    if (!Array.isArray(taskRecord.subTask) || subTaskIndex < 0 || subTaskIndex >= taskRecord.subTask.length) {
      throw new Error('Invalid subTaskIndex');
    }
    return taskRecord.subTask[subTaskIndex];
  }
  return taskRecord.subTask;
}


/**
 * Delete a subTask by index from a TaskRecord.
 */
async function deleteSubTask(taskId, subTaskIndex) {
  if (!taskId) throw new Error('taskId is required');
  if (typeof subTaskIndex !== 'number') throw new Error('subTaskIndex must be a number');

  const taskRecord = await TaskRecord.findOne({ taskId });
  if (!taskRecord) throw new Error('Task not found');

  if (!Array.isArray(taskRecord.subTask) || subTaskIndex < 0 || subTaskIndex >= taskRecord.subTask.length) {
    throw new Error('Invalid subTaskIndex');
  }

  taskRecord.subTask.splice(subTaskIndex, 1);
  await taskRecord.save();
  return taskRecord;
}


/**
 * Add a new submission to a subTask.
 *
 * All fields in the submission are mandatory, INCLUDING locationStatus ('warehouse' | 'missing').
 * challanNo must be unique across ALL submissions in this TaskRecord.
 *
 * Reads challanPhotoPath from submissionData.challanPhotoPath (controller now correctly sets this field).
 * Reads locationStatus (required; enum per @TaskRecord.js 44-48).
 */
async function addSubmissionToSubTask(taskId, subTaskId, submissionData, imageFile = null) {
  console.log(submissionData);
  try {
    if (!taskId) throw new Error('taskId is required');
    if (!subTaskId) throw new Error('subTaskId is required');

    const requiredFields = [
      'fabricPartyName',
      'recieverPartyName',
      'length',
      'MTR',
      'Payment',
      'challanNo',
      'submitterName',
      'locationStatus',
    ];
    for (const field of requiredFields) {
      if (
        typeof submissionData[field] === 'undefined' ||
        submissionData[field] === null ||
        (typeof submissionData[field] === 'string' && submissionData[field].trim() === '')
      ) {
        throw new Error(`${field} is required for submission`);
      }
    }

    // Validate locationStatus enum (warehouse/missing)
    const allowedStatuses = ['warehouse', 'missing'];
    if (!allowedStatuses.includes(submissionData.locationStatus)) {
      throw new Error("Invalid 'locationStatus'. Must be either 'warehouse' or 'missing'.");
    }

    // challanPhotoPath is required for new submissions
    if (!submissionData.challanPhotoPath) {
      throw new Error('challanPhotoPath is required for new submission');
    }

    const taskRecord = await TaskRecord.findOne({ taskId });
    if (!taskRecord) throw new Error('Task not found');

    // Unique challanNo check across all submissions in all subTasks
    for (const st of taskRecord.subTask || []) {
      for (const sub of Array.isArray(st.submission) ? st.submission : []) {
        if (
          String(sub.challanNo).trim().toLowerCase() ===
          String(submissionData.challanNo).trim().toLowerCase()
        ) {
          throw new Error('challanNo must be unique among all submissions in this TaskRecord');
        }
      }
    }

    const subTask = taskRecord.subTask.find((s) => s.subTaskId === subTaskId);
    if (!subTask) throw new Error('SubTask not found');

    const submission = {
      fabricPartyName: submissionData.fabricPartyName,
      recieverPartyName: submissionData.recieverPartyName,
      length: submissionData.length,
      MTR: submissionData.MTR,
      Payment: submissionData.Payment,
      challanNo: submissionData.challanNo,
      challanPhotoPath: submissionData.challanPhotoPath,
      submitterName: submissionData.submitterName,
      locationStatus: submissionData.locationStatus, // Include locationStatus per @TaskRecord.js 44-48
    };

    if (!Array.isArray(subTask.submission)) subTask.submission = [];
    subTask.submission.push(submission);

    await taskRecord.save();
    return submission;
  } catch (error) {
    console.error('Error in addSubmissionToSubTask:', error);
    throw error;
  }
}


/**
 * Edit an existing submission for a subTask.
 *
 * Accepts and updates 'locationStatus' (warehouse/missing) as per @TaskRecord.js 44-48.
 * FIX 1: submissionIndex is now correctly received from the controller.
 * FIX 2: when no new file is uploaded and no challanPhotoPath is sent in the body,
 *         the existing stored challanPhotoPath is preserved (not overwritten with undefined).
 * FIX 3: challanNo uniqueness check properly excludes the submission being edited.
 */
async function editSubmissionOfSubTask(taskId, subTaskId, submissionIndex, submissionData, imageFile = null) {

  try {
    if (!taskId) throw new Error('taskId is required');
    if (!subTaskId) throw new Error('subTaskId is required');
    if (typeof submissionIndex !== 'number' || isNaN(submissionIndex)) {
      throw new Error('submissionIndex is required and must be a number');
    }

    const requiredFields = [
      'fabricPartyName',
      'recieverPartyName',
      'length',
      'MTR',
      'Payment',
      'challanNo',
      'submitterName',
      'locationStatus',
    ];
    for (const field of requiredFields) {
      if (
        typeof submissionData[field] === 'undefined' ||
        submissionData[field] === null ||
        (typeof submissionData[field] === 'string' && submissionData[field].trim() === '')
      ) {
        throw new Error(`${field} is required for submission`);
      }
    }

    // Validate locationStatus enum (warehouse/missing)
    const allowedStatuses = ['warehouse', 'missing'];
    if (!allowedStatuses.includes(submissionData.locationStatus)) {
      throw new Error("Invalid 'locationStatus'. Must be either 'warehouse' or 'missing'.");
    }

    const taskRecord = await TaskRecord.findOne({ taskId });
    if (!taskRecord) throw new Error('Task not found');

    const subTask = taskRecord.subTask.find((s) => s.subTaskId === subTaskId);
    if (!subTask) throw new Error('SubTask not found');

    if (!Array.isArray(subTask.submission) || submissionIndex < 0 || submissionIndex >= subTask.submission.length) {
      throw new Error('Invalid submissionIndex');
    }

    // Unique challanNo check — exclude the submission being edited (by subTaskId + index)
    for (const st of taskRecord.subTask || []) {
      const submissions = Array.isArray(st.submission) ? st.submission : [];
      for (let idx = 0; idx < submissions.length; idx++) {
        const sub = submissions[idx];
        // Skip the current submission itself
        if (st.subTaskId === subTaskId && idx === submissionIndex) continue;
        if (
          String(sub.challanNo).trim().toLowerCase() ===
          String(submissionData.challanNo).trim().toLowerCase()
        ) {
          throw new Error('challanNo must be unique among all submissions in this TaskRecord');
        }
      }
    }

    // Determine challanPhotoPath to save
    // Priority: 1) new uploaded file path (set by controller), 2) existing path sent from frontend body,
    //           3) fall back to the currently stored path in DB
    let challanPhotoPath = submissionData.challanPhotoPath;
    if (!challanPhotoPath) {
      challanPhotoPath = subTask.submission[submissionIndex]?.challanPhotoPath;
    }

    if (!challanPhotoPath) {
      throw new Error('challanPhotoPath is required — provide a new photo or ensure an existing one is on record');
    }

    const updatedSubmission = {
      fabricPartyName: submissionData.fabricPartyName,
      recieverPartyName: submissionData.recieverPartyName,
      length: submissionData.length,
      MTR: submissionData.MTR,
      Payment: submissionData.Payment,
      challanNo: submissionData.challanNo,
      challanPhotoPath, // Preserved/correctly set
      submitterName: submissionData.submitterName,
      locationStatus: submissionData.locationStatus, // Include/update locationStatus
    };

    subTask.submission[submissionIndex] = updatedSubmission;
    await taskRecord.save();
    return updatedSubmission;
  } catch (error) {
    console.error('Error in editSubmissionOfSubTask:', error);
    throw error;
  }
}


/**
 * Delete a specific submission entry from a subTask.
 *
 * submissionIndex: index in the subTask.submission array (required).
 */
async function deleteSubmissionOfSubTask(taskId, subTaskId, submissionIndex) {
  if (!taskId) throw new Error('taskId is required');
  if (!subTaskId) throw new Error('subTaskId is required');

  const parsedIndex = typeof submissionIndex === 'number'
    ? submissionIndex
    : parseInt(submissionIndex, 10);

  if (isNaN(parsedIndex)) {
    throw new Error('submissionIndex is required and must be a number');
  }

  const taskRecord = await TaskRecord.findOne({ taskId });
  if (!taskRecord) throw new Error('Task not found');

  const subTask = taskRecord.subTask.find((s) => s.subTaskId === subTaskId);
  if (!subTask) throw new Error('SubTask not found');

  if (!Array.isArray(subTask.submission) || parsedIndex < 0 || parsedIndex >= subTask.submission.length) {
    throw new Error('Invalid submissionIndex');
  }

  subTask.submission.splice(parsedIndex, 1);
  await taskRecord.save();
  return subTask;
}


/**
 * Fetch all submissions (array) for a subTask.
 * Optionally filter to a single submission by submissionIndex.
 */
async function fetchSubmissionOfSubTask(taskId, subTaskId, submissionIndex = undefined) {
  if (!taskId) throw new Error('taskId is required');
  if (!subTaskId) throw new Error('subTaskId is required');

  const taskRecord = await TaskRecord.findOne({ taskId });
  if (!taskRecord) throw new Error('Task not found');

  const subTask = taskRecord.subTask.find((s) => s.subTaskId === subTaskId);
  if (!subTask) throw new Error('SubTask not found');

  if (!Array.isArray(subTask.submission)) return [];

  if (typeof submissionIndex === 'number') {
    if (submissionIndex < 0 || submissionIndex >= subTask.submission.length) {
      throw new Error('Invalid submissionIndex');
    }
    return subTask.submission[submissionIndex];
  }
  return subTask.submission;
}


module.exports = {
  fetchTaskDataSchemaFields,
  createTasks,
  editTask,
  fetchTasks,
  fetchByTaskId,
  deleteTask,

  fetchTasksWithPendingSubTasks,

  addSubTask,
  fetchSubTasks,
  editSubTask,
  deleteSubTask,

  addSubmissionToSubTask,
  editSubmissionOfSubTask,
  fetchSubmissionOfSubTask,
  deleteSubmissionOfSubTask,
};