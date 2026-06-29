

const TaskData = require('../models/TaskData');
const TaskRecord = require('../models/TaskRecord');



/**
 * Fetch dashboard fabric stats with debug logs and filter options:
 *  - Filter by: Date range (Today, Yesterday, Last 7 days, Last 30 days, This month, Custom)
 *  - PartyName, FabricType
 *  - All other stats are as before.
 * @param {Object} filter
 *        filter.dateRange: "today"|"yesterday"|"last7days"|"last30days"|"thismonth"|{from:date,to:date}|null
 *        filter.partyName
 *        filter.fabricType
 */
async function fetchDashboardFabricStats(filter = {}) {
  const {
    dateRange = null,
    partyName = null,
    fabricType = null
  } = filter || {};

  // 1. Build date filter for Mongo `_createdAt` (or fallback to createdAt/updatedAt)
  let dateQuery = {};
  if (dateRange) {
    let from, to;
    const today = new Date();
    today.setHours(0,0,0,0);

    if (typeof dateRange === 'string') {
      switch(dateRange) {
        case 'today':
          from = new Date(today);
          to = new Date(today);
          to.setHours(23,59,59,999);
          break;
        case 'yesterday':
          from = new Date(today);
          from.setDate(from.getDate() - 1);
          to = new Date(today);
          to.setDate(to.getDate() - 1);
          to.setHours(23,59,59,999);
          break;
        case 'last7days':
          from = new Date(today);
          from.setDate(from.getDate() - 6);
          to = new Date(today);
          to.setHours(23,59,59,999);
          break;
        case 'last30days':
          from = new Date(today);
          from.setDate(from.getDate() - 29);
          to = new Date(today);
          to.setHours(23,59,59,999);
          break;
        case 'thismonth':
          from = new Date(today.getFullYear(), today.getMonth(), 1);
          to = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
          break;
        default:
          break;
      }
    } else if (typeof dateRange === 'object' && dateRange.from && dateRange.to) {
      from = new Date(dateRange.from);
      to = new Date(dateRange.to);
      to.setHours(23,59,59,999);
    }

    if (from && to) {
      dateQuery.createdAt = { $gte: from, $lte: to };
    }
  }

  // 2. Build partyName/fabricType filter
  let recordMatch = {};
  if (partyName) recordMatch.partyName = partyName;
  if (fabricType) recordMatch.FabricType = fabricType;

  // Add dateQuery into recordMatch for querying TaskRecord
  recordMatch = { ...recordMatch, ...dateQuery };

  // 3. Fetch filtered TaskRecords
  const allTaskRecords = await TaskRecord.find(
    recordMatch,
    {
      subTask: 1,
      sinkage: 1,
      Length: 1,
      taskId: 1,
      _id: 0,
    }
  );
  console.log('[Dashboard] Fetched TaskRecords:', allTaskRecords.length, 'Filter:', recordMatch);

  let totalFabricIn = 0;
  let totalFabricInProcessing = 0;
  let totalFabricSubmitted = 0;
  let totalFabricMissing = 0;

  for (const rec of allTaskRecords) {
    const taskSinkage = Number(rec.sinkage) || 0;
    const taskLength = Number(rec.Length) || 0;
    const subTasks = Array.isArray(rec.subTask) ? rec.subTask : [];

    for (const subTask of subTasks) {
      // Extra filter: Filter subTask by partyName/fabricType if present in subTask (for some use cases)
      // (skip for now: records are already filtered at parent level)

      const subTaskId = subTask.subTaskId || subTask._id || "-";
      const subTaskMtr = Number(subTask.mtr) || 0;

      // A. sum all subTask.mtr for totalFabricIn
      totalFabricIn += subTaskMtr;
      console.log(
        `[Dashboard] Task=${rec.taskId} SubTask=${subTaskId} mtr=${subTaskMtr} (totalFabricIn running sum: ${totalFabricIn})`
      );

      // B. Processing status: see logic
      let status = subTask.status || "";
      let isProcessing = false;
      if (
        status === "processing" ||
        status === "pending" ||
        status === "in_progress"
      ) {
        isProcessing = true;
      } else if (
        (!subTask.submission || subTask.submission.length === 0) &&
        !status
      ) {
        isProcessing = true;
      }
      if (isProcessing) {
        totalFabricInProcessing += subTaskMtr;
        console.log(
          `  [Dashboard] SubTask ${subTaskId} counted as processing (status=${status}). Added ${subTaskMtr} (sum: ${totalFabricInProcessing})`
        );
      }

      // Submission(s)
      let submissionsArr = [];
      if (Array.isArray(subTask.submission)) {
        submissionsArr = subTask.submission;
      } else if (subTask.submission) {
        submissionsArr = [subTask.submission];
      }

      let sumSubmissionMTR = 0;
      let hasMissing = false;

      for (const submission of submissionsArr) {
        const submissionMTR = Number(submission.MTR) || 0;
        sumSubmissionMTR += submissionMTR;
        if (submission.locationStatus === "missing") hasMissing = true;
      }
      totalFabricSubmitted += sumSubmissionMTR;
      console.log(
        `  [Dashboard] SubTask ${subTaskId} submissions: count=${submissionsArr.length}, sumSubmissionMTR=${sumSubmissionMTR}, hasMissing=${hasMissing} (totalFabricSubmitted=${totalFabricSubmitted})`
      );

      // Missing: if any submission marked missing
      if (
        hasMissing &&
        typeof subTask.mtr !== "undefined" &&
        typeof rec.sinkage !== "undefined" &&
        typeof rec.Length !== "undefined"
      ) {
        const mtrRaw = Number(subTask.mtr);
        const sinkagePercent = Number(rec.sinkage) || 0;
        const lengthPercent = Number(rec.Length) || 0;
        const lengthLossPercent = 100 - lengthPercent;
        const totalPercent = sinkagePercent + lengthLossPercent;
        // from SubmissionManagement.jsx: mtrAfter = mtr - (mtr * totalPercent / 100)
        const mtrAfterLengthSinkage =
          mtrRaw - (mtrRaw * totalPercent) / 100;
        const missingForSubTask = Math.max(mtrAfterLengthSinkage - sumSubmissionMTR, 0);

        totalFabricMissing += missingForSubTask;
        console.log(
          `    [Dashboard] SubTask ${subTaskId}: missing calculation (mtrAfterLengthSinkage=${mtrAfterLengthSinkage}, submissionSum=${sumSubmissionMTR}, missingForSubTask=${missingForSubTask}) (Running totalFabricMissing=${totalFabricMissing})`
        );
      }
    }
  }

  // Final totals
  console.log("[Dashboard] Results:");
  console.log("  totalFabricIn:", totalFabricIn);
  console.log("  totalFabricInProcessing:", totalFabricInProcessing);
  console.log("  totalFabricSubmitted:", totalFabricSubmitted);
  console.log("  totalFabricMissing:", totalFabricMissing);

  return {
    totalFabricIn,
    totalFabricInProcessing,
    totalFabricSubmitted,
    totalFabricMissing: Number(totalFabricMissing.toFixed(2)),
  };
}







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
    const taskId = sanitizedPartyName
      ? `${sanitizedPartyName}-${currentCounter++}`
      : `${currentCounter++}`;
    // Remove taskStatus in final object
    const { taskStatus, ...rest } = item;
    return { ...groupData, ...rest, taskId };
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
  // Remove taskStatus if present in updateData
  if (Object.prototype.hasOwnProperty.call(updateData, 'taskStatus')) {
    delete updateData.taskStatus;
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
  return await TaskRecord.find({}).sort({ createdAt: -1 });
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
      //'Payment', // Removed Payment
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
      //Payment: submissionData.Payment, // Removed Payment
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
      //'Payment', // Removed Payment
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
      //Payment: submissionData.Payment, // Removed Payment
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
fetchDashboardFabricStats,

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