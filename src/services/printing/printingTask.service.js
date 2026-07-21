

const TaskData = require('../../models/printing/PrintingTaskData');
const TaskRecord = require('../../models/printing/PrintingTaskRecord');



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

  // 1. Build date filter for Mongo `createdAt`
  let dateQuery = {};
  if (dateRange) {
    let from, to;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (typeof dateRange === 'string') {
      switch (dateRange) {
        case 'today':
          from = new Date(today);
          to = new Date(today);
          to.setHours(23, 59, 59, 999);
          break;
        case 'yesterday':
          from = new Date(today);
          from.setDate(from.getDate() - 1);
          to = new Date(today);
          to.setDate(to.getDate() - 1);
          to.setHours(23, 59, 59, 999);
          break;
        case 'last7days':
          from = new Date(today);
          from.setDate(from.getDate() - 6);
          to = new Date(today);
          to.setHours(23, 59, 59, 999);
          break;
        case 'last30days':
          from = new Date(today);
          from.setDate(from.getDate() - 29);
          to = new Date(today);
          to.setHours(23, 59, 59, 999);
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
      to.setHours(23, 59, 59, 999);
    }

    if (from && to) {
      dateQuery.createdAt = { $gte: from, $lte: to };
    }
  }

  // 2. Build partyName/fabricType filter
  let recordMatch = {};
  if (partyName) recordMatch.partyName = partyName;
  if (fabricType) recordMatch.FabricType = fabricType;

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
      MTR: 1,
    }
  );

  let totalFabricIn = 0;
  let totalFabricInL100 = 0;
  let totalFabricInProcessing = 0;
  let totalFabricMissing = 0;
  let totalFabricInSubmission = 0;
  let totalFabricInSubmissionL100 = 0;
  let savedSinkage = 0;
  let totalMTRShort = 0;

  for (const rec of allTaskRecords) {
    const taskSinkage = Number(rec.sinkage) || 0;
    const taskLength = Number(rec.Length) || 0;
    const subTasks = Array.isArray(rec.subTask) ? rec.subTask : [];

    // Only sum up task-level MTR for totalFabricIn (do not include subTask.mtr)
    const recMTR = Number(rec.MTR) || 0;
    totalFabricIn += recMTR;
    if (!isNaN(recMTR) && !isNaN(taskLength)) {
      totalFabricInL100 += (recMTR * (taskLength / 100));
    }

    if (subTasks.length === 0) {
      // If no subTasks, do not add to totalFabricInProcessing
    } else {
      for (const subTask of subTasks) {
        const subTaskId = subTask.subTaskId || subTask._id || "-";
        const subTaskMtr = Number(subTask.mtr) || 0;
        const subTaskMtrShort = Number(subTask.mtrShort) || 0;

        totalMTRShort += subTaskMtrShort;
        totalFabricInProcessing += subTaskMtr;

        // 4. Submissions/Submission arrays
        let submissionsArr = [];
        if (Array.isArray(subTask.submission)) {
          submissionsArr = subTask.submission;
        } else if (subTask.submission) {
          submissionsArr = [subTask.submission];
        }

        let submissionMTRSum = 0;
        let submissionMTRL100Sum = 0;

        // For missing calculation
        let hasMissing = false;

        // 6. Saved Sinkage collection
        for (const submission of submissionsArr) {
          const submissionMTR = Number(submission.MTR) || 0;
          const submissionLength = Number(submission.length) || 0;

          // Total Fabric In Submission = sum of Submission MTR
          submissionMTRSum += submissionMTR;

          // SubmissionMTR(L100): = submissionMTR - (100 - submissionLength)%
          // This is: submissionMTR * (submissionLength / 100)
          let submissionMTRL100 = 0;
          if (!isNaN(submissionMTR) && !isNaN(submissionLength)) {
            submissionMTRL100 = submissionMTR * (submissionLength / 100);
            submissionMTRL100Sum += submissionMTRL100;
          }

          // Saved Sinkage
          if (submission.locationStatus === "savedSinkage") {
            const ssval = Number(submission.savedSinkage) || 0;
            savedSinkage += ssval;
          }

          // For missing
          if (submission.locationStatus === "missing") {
            hasMissing = true;
          }
        }

        // Add to global totals
        totalFabricInSubmission += submissionMTRSum;
        totalFabricInSubmissionL100 += submissionMTRL100Sum;

        // 7. Total Fabric Missing
        // For each subTask where any submission locationStatus === 'missing'
        // totalFabricMissing += (subTaskMTR - taskSinkage%) - sum(all SubmissionMTR(L100))
        if (hasMissing) {
          // Calculate (subTaskMtr - taskSinkage%)
          // Sinkage is in %, so reduce sinkage% of subTaskMtr
          let subTaskMtrAfterSinkage = subTaskMtr;
          if (!isNaN(subTaskMtr) && !isNaN(taskSinkage)) {
            subTaskMtrAfterSinkage = subTaskMtr * (1 - (taskSinkage / 100));
          }

          // submissionMTRL100Sum is already the sum of all SubmissionMTR(L100)
          let missing = subTaskMtrAfterSinkage - submissionMTRL100Sum;
          if (missing < 0) missing = 0;
          totalFabricMissing += missing;

          // Optional log for debugging:
          console.log("Fabric missing calculation:", {
            subTaskMtr,
            taskSinkage,
            subTaskMtrAfterSinkage,
            submissionMTRL100Sum,
            missing,
            totalFabricMissing,
          });
        }
      }
    }
  }

  return {
    totalFabricIn: Number(totalFabricIn.toFixed(2)),
    totalFabricInL100: Number(totalFabricInL100.toFixed(2)),
    totalFabricInProcessing: Number(totalFabricInProcessing.toFixed(2)),
    totalFabricInSubmission: Number(totalFabricInSubmission.toFixed(2)),
    totalFabricInSubmissionL100: Number(totalFabricInSubmissionL100.toFixed(2)),
    totalFabricMissing: Number(totalFabricMissing.toFixed(2)),
    savedSinkage: Number(savedSinkage.toFixed(2)),
    totalMTRShort: Number(totalMTRShort.toFixed(2)),
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
 * Fetch tasks (single by taskId or multiple with filter, including date, partyName, transportName, receiverName, fabricType).
 * Supports pagination: { page, pageSize }
 * Filters:
 *   - from, to: (ISO strings representing date range, matched on createdAt)
 *   - partyName, transportName, receiverName, fabricType: (string; partial/case-insensitive match)
 */
async function fetchTasks(filter = {}) {
  const {
    taskId,
    dateFrom,
    dateTo,
    partyName,
    transportName,
    receiverName,
    fabricType,
    page = 1,
    pageSize = 10,
  } = filter;

  // Debug/filter checks
  console.log('[fetchTasks] filter:', filter);

  if (taskId) {
    const total = await TaskRecord.countDocuments({ taskId });
    const results = await TaskRecord.find({ taskId });
    return {
      data: results,
      total,
      page: 1,
      pageSize: results.length,
      totalPages: 1,
    };
  }

  const andQueries = [];

  // Date range filter (createdAt)
  if (dateFrom || dateTo) {
    const dateQuery = {};
    if (dateFrom) dateQuery.$gte = new Date(dateFrom);
    if (dateTo) dateQuery.$lte = new Date(dateTo);
    andQueries.push({ createdAt: dateQuery });
    console.log('[fetchTasks] Date filter:', dateQuery);
  }

  // Party Name filter (case-insensitive partial match)
  if (partyName) {
    andQueries.push({ partyName: { $regex: partyName, $options: 'i' } });
    console.log('[fetchTasks] Party name filter:', partyName);
  }

  // Transport Name filter
  if (transportName) {
    andQueries.push({ transportName: { $regex: transportName, $options: 'i' } });
    console.log('[fetchTasks] Transport name filter:', transportName);
  }

  // Receiver Name filter
  if (receiverName) {
    andQueries.push({ receiverName: { $regex: receiverName, $options: 'i' } });
    console.log('[fetchTasks] Receiver name filter:', receiverName);
  }

  // FabricType filter
  if (fabricType) {
    andQueries.push({ FabricType: { $regex: fabricType, $options: 'i' } });
    console.log('[fetchTasks] FabricType filter:', fabricType);
  }

  // Combine queries
  let query = andQueries.length > 0 ? { $and: andQueries } : {};

  // Pagination calculation
  const skip = (Math.max(Number(page), 1) - 1) * Math.max(Number(pageSize), 1);
  const limit = Math.max(Number(pageSize), 1);

  console.log('[fetchTasks] query:', JSON.stringify(query));
  console.log(`[fetchTasks] Pagination: skip=${skip}, limit=${limit}`);

  // Results with pagination and newest first
  const total = await TaskRecord.countDocuments(query);
  const results = await TaskRecord.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  console.log(`[fetchTasks] Results: returned=${results.length}, total=${total}`);

  return {
    data: results,
    total,
    page: Number(page),
    pageSize: Number(pageSize),
    totalPages: Math.ceil(total / Number(pageSize) || 1),
  };
}


/**
 * Fetch a task by its taskId.
 */
async function fetchByTaskId(taskId) {
  if (!taskId) throw new Error('taskId is required');
  return await TaskRecord.findOne({ taskId });
}


/**
 * Fetch all tasks which have at least one subTask with 'pending' status, with filters and pagination.
 * Filters:
 *   - dateFrom: ISO date string (filter by createdAt >= dateFrom)
 *   - dateTo: ISO date string (filter by createdAt <= dateTo)
 *   - partyName: main partyName (case-insensitive substring match)
 *   - transportName: transportName field (case-insensitive substring match)
 *   - receiverName: receiverName field (case-insensitive substring match)
 *   - fabricType: FabricType field (case-insensitive substring match)
 *   - programName: filter if at least one subTask.program matches this (case-insensitive substring match)
 *   - jigarNo: filter if at least one subTask.jigarNo matches this (case-insensitive substring match)
 *   - page, pageSize: pagination control
 */
async function fetchTasksWithPendingSubTasks({
  dateFrom,
  dateTo,
  partyName,
  transportName,
  receiverName,
  fabricType,
  programName,
  jigarNo,
  page = 1,
  pageSize = 20,
} = {}) {
  const andQueries = [];



  // Date filter (createdAt)
  if (dateFrom || dateTo) {
    const dateQuery = {};
    if (dateFrom) dateQuery.$gte = new Date(dateFrom);
    if (dateTo) dateQuery.$lte = new Date(dateTo);
    andQueries.push({ createdAt: dateQuery });
  }

  // Party Name filter
  if (partyName) {
    andQueries.push({ partyName: { $regex: partyName, $options: 'i' } });
  }

  // Transport Name filter
  if (transportName) {
    andQueries.push({ transportName: { $regex: transportName, $options: 'i' } });
  }

  // Receiver Name filter
  if (receiverName) {
    andQueries.push({ receiverName: { $regex: receiverName, $options: 'i' } });
  }

  // Fabric Type filter
  if (fabricType) {
    andQueries.push({ FabricType: { $regex: fabricType, $options: 'i' } });
  }

  // programName in subTask
  if (programName) {
    andQueries.push({ 'subTask': { $elemMatch: { program: { $regex: programName, $options: 'i' } } } });
  }

  // jigarNo in subTask
  if (jigarNo) {
    andQueries.push({ 'subTask': { $elemMatch: { jigarNo: { $regex: jigarNo, $options: 'i' } } } });
  }

  const query = andQueries.length > 0 ? { $and: andQueries } : {};

  // Pagination
  const safePage = Math.max(Number(page) || 1, 1);
  const safePageSize = Math.max(Number(pageSize) || 20, 1);
  const skip = (safePage - 1) * safePageSize;
  const limit = safePageSize;

  // Query
  const total = await TaskRecord.countDocuments(query);
  const results = await TaskRecord.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    data: results,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.ceil(total / safePageSize) || 1,
  };
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
 * All fields in the submission are mandatory, INCLUDING locationStatus ('warehouse' | 'missing' | 'savedSinkage').
 * challanNo must be unique across ALL submissions in this TaskRecord.
 *
 * Reads challanPhotoPath from submissionData.challanPhotoPath (controller now correctly sets this field).
 * Reads locationStatus (required; enum per @TaskRecord.js 44-48).
 * If locationStatus is 'savedSinkage', saves savedSinkage number as well (optional, but must be present if locationStatus === 'savedSinkage').
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

    // Validate locationStatus enum (warehouse/missing/savedSinkage)
    const allowedStatuses = ['warehouse', 'missing', 'savedSinkage'];
    if (!allowedStatuses.includes(submissionData.locationStatus)) {
      throw new Error("Invalid 'locationStatus'. Must be 'warehouse', 'missing', or 'savedSinkage'.");
    }

    // If locationStatus is 'savedSinkage', savedSinkage number must be present and valid
    let submission = {
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

    if (submissionData.locationStatus === 'savedSinkage') {
      // savedSinkage is required and must be a number
      if (
        typeof submissionData.savedSinkage === 'undefined' ||
        submissionData.savedSinkage === null ||
        isNaN(Number(submissionData.savedSinkage))
      ) {
        throw new Error('savedSinkage is required and must be a valid number when locationStatus is "savedSinkage".');
      }
      submission.savedSinkage = Number(submissionData.savedSinkage);
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
 * Accepts and updates 'locationStatus' ('warehouse' | 'missing' | 'savedSinkage') as per @TaskRecord.js 44-48.
 * If changing or setting to 'savedSinkage', also expects and saves savedSinkage number.
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

    // Validate locationStatus enum (warehouse/missing/savedSinkage)
    const allowedStatuses = ['warehouse', 'missing', 'savedSinkage'];
    if (!allowedStatuses.includes(submissionData.locationStatus)) {
      throw new Error("Invalid 'locationStatus'. Must be 'warehouse', 'missing', or 'savedSinkage'.");
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

    // Build updated submission, handle savedSinkage
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

    if (submissionData.locationStatus === 'savedSinkage') {
      if (
        typeof submissionData.savedSinkage === 'undefined' ||
        submissionData.savedSinkage === null ||
        isNaN(Number(submissionData.savedSinkage))
      ) {
        throw new Error('savedSinkage is required and must be a valid number when locationStatus is "savedSinkage".');
      }
      updatedSubmission.savedSinkage = Number(submissionData.savedSinkage);
    }

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