

const taskService = require('../../services/printing/printingTask.service');
const fs = require('fs');
const path = require('path');



/**
 * Controller to fetch dashboard fabric statistics with filtering.
 * Supports filtering by date range (today, yesterday, last7days, last30days, thismonth, custom),
 * partyName, and fabricType via query parameters.
 * Responds with totalFabricIn, totalFabricInProcessing, totalFabricSubmitted, totalFabricMissing.
 * 
 * Query params:
 *   - dateRange: [today|yesterday|last7days|last30days|thismonth|custom]
 *   - from: string (for custom dateRange; ISO date)
 *   - to: string (for custom dateRange; ISO date)
 *   - partyName: string
 *   - fabricType: string
 */
// async function fetchDashboardFabricStatsController(req, res) {
//   try {
//     const { dateRange, from, to, partyName, fabricType } = req.query;

//     // Build filter object as expected by fetchDashboardFabricStats
//     let filter = {};

//     // Date filtering logic
//     if (dateRange) {
//       if (dateRange === "custom" && from && to) {
//         filter.dateRange = { from, to };
//       } else {
//         // today, yesterday, last7days, last30days, thismonth
//         filter.dateRange = dateRange;
//       }
//     }

//     if (partyName) filter.partyName = partyName;
//     if (fabricType) filter.fabricType = fabricType;

//     const stats = await taskService.fetchDashboardFabricStats(filter);
//     res.json({ success: true, data: stats });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// }

async function fetchDashboardFabricStatsController(req, res) {
  try {
    const { from, to, partyName, fabricType } = req.query;

    let filter = {};

    if (from && to) {
      filter.dateRange = { from, to };
    }

    if (partyName) filter.partyName = partyName;
    if (fabricType) filter.fabricType = fabricType;

    const stats = await taskService.fetchDashboardFabricStats(filter);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}


/**
 * Controller to fetch specific task data schema config fields.
 */
async function fetchTaskDataSchemaFieldsController(req, res) {
  try {
    const configFields = await taskService.fetchTaskDataSchemaFields();
    res.json({ success: true, data: configFields });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}


/**
 * Controller to create one or multiple tasks.
 */
async function createTasksController(req, res) {
  let fileToDelete = null;
  try {
    let { groupData, taskDetails } = req.body;

    if (typeof groupData === 'string') groupData = JSON.parse(groupData);
    if (typeof taskDetails === 'string') taskDetails = JSON.parse(taskDetails);

    if (req.file) {
      let fileName = req.file.filename;
      if (!fileName && req.file.originalname) {
        fileName = req.file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
      }
      if (fileName) {
        groupData.challanPhotoPath = `/uploads/${fileName}`;
        fileToDelete = path.join(__dirname, '..', 'uploads', fileName);
      }
    }

    const createdTasks = await taskService.createTasks(groupData, taskDetails);
    res.status(201).json({ success: true, data: createdTasks });
  } catch (error) {
    if (fileToDelete && fs.existsSync(fileToDelete)) {
      try { fs.unlinkSync(fileToDelete); } catch {/* ignore */}
    }
    res.status(400).json({ success: false, message: error.message });
  }
}


/**
 * Controller to edit/update a task by taskId.
 */
async function editTaskController(req, res) {
  let fileToDelete = null;
  try {
    const { taskId } = req.params;
    let updateData = req.body;

    if (typeof updateData === 'string') updateData = JSON.parse(updateData);

    if (req.file) {
      let fileName = req.file.filename;
      if (!fileName && req.file.originalname) {
        fileName = req.file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
      }
      if (fileName) {
        updateData.challanPhotoPath = `/uploads/${fileName}`;
        fileToDelete = path.join(__dirname, '..', 'uploads', fileName);
      }
    }

    const updatedTask = await taskService.editTask(taskId, updateData);
    res.json({ success: true, data: updatedTask });
  } catch (error) {
    if (fileToDelete && fs.existsSync(fileToDelete)) {
      try { fs.unlinkSync(fileToDelete); } catch {/* ignore */}
    }
    res.status(400).json({ success: false, message: error.message });
  }
}


/**
 * Controller to fetch single or multiple tasks with filters and pagination.
 * Supported filters: from, to (date range on createdAt), partyName, transportName,
 * receiverName, fabricType, page, pageSize.
 */
async function fetchTasksController(req, res) {
  try {
    const {
      dateFrom,
      dateTo,
      partyName,
      transportName,
      receiverName,
      fabricType,
      page,
      pageSize,
      taskId,
      ...rest
    } = req.query;

    // Compose filters as per task.service.js
    const filter = {
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
      ...(partyName ? { partyName } : {}),
      ...(transportName ? { transportName } : {}),
      ...(receiverName ? { receiverName } : {}),
      ...(fabricType ? { fabricType } : {}),
      ...(page ? { page } : {}),
      ...(pageSize ? { pageSize } : {}),
      ...(taskId ? { taskId } : {}),
      ...rest, // any other filters
    };

    const result = await taskService.fetchTasks(filter);

    // result shape (see service): { data, total, page, pageSize, totalPages }
    res.json({
      success: true,
      ...result, // flatten the pagination fields for easier access
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Controller to fetch a task by its taskId (query param or route param).
 */
async function fetchTaskByTaskIdController(req, res) {
  try {
    const taskId = req.params.taskId || req.query.taskId;
    if (!taskId) {
      return res.status(400).json({ success: false, message: 'taskId is required' });
    }
    const task = await taskService.fetchByTaskId(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Controller to fetch all tasks that have at least one subTask with 'pending' status,
 * supports filtering and pagination based on query parameters.
 */
async function fetchTasksWithPendingSubTasksController(req, res) {
  try {
    const {
      fromdate,
      toDate,
      partyName,
      transportName,
      receiverName,
      fabricType,
      programName,
      jigarNo,
      page,
      pageSize,
      ...rest // pass through any extra query filters
    } = req.query;

    // Always ensure taskType is ReadyFabric
    const filters = {
      ...(fromdate ? { fromdate } : {}),
      ...(toDate ? { toDate } : {}),
      ...(partyName ? { partyName } : {}),
      ...(transportName ? { transportName } : {}),
      ...(receiverName ? { receiverName } : {}),
      ...(fabricType ? { fabricType } : {}),
      ...(programName ? { programName } : {}),
      ...(jigarNo ? { jigarNo } : {}),
      ...(page ? { page } : {}),
      ...(pageSize ? { pageSize } : {}),
      ...rest,
    };

    const result = await taskService.fetchTasksWithPendingSubTasks(filters);

    // result shape: { data, total, page, pageSize, totalPages }
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}



/**
 * Controller to delete a task by taskId.
 */
async function deleteTaskController(req, res) {
  try {
    const { taskId } = req.params;
    const deletedTask = await taskService.deleteTask(taskId);
    res.json({ success: true, data: deletedTask });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}



// /**
//  * Controller to add a subTask to a TaskRecord.
//  */
// async function addSubTaskController(req, res) {
//   try {
//     const { taskId } = req.params;
//     const subTask = req.body;
//     const updatedTask = await taskService.addSubTask(taskId, subTask);
//     res.json({ success: true, data: updatedTask });
//   } catch (error) {
//     res.status(400).json({ success: false, message: error.message });
//   }
// }


// /**
//  * Controller to edit/update a subTask for a TaskRecord.
//  */
// async function editSubTaskController(req, res) {
//   try {
//     const { taskId, subTaskIndex } = req.params;
//     const updateData = req.body;
//     const updatedTask = await taskService.editSubTask(taskId, parseInt(subTaskIndex, 10), updateData);
//     res.json({ success: true, data: updatedTask });
//   } catch (error) {
//     res.status(400).json({ success: false, message: error.message });
//   }
// }

/**
 * Controller to add a subTask to a TaskRecord.
 */
// async function addSubTaskController(req, res) {
//   let fileToDelete = null;
//   try {
//     const { taskId } = req.params;
//     const subTask = req.body;

//     if (req.file) {
//       let fileName = req.file.filename;
//       if (!fileName && req.file.originalname) {
//         fileName = req.file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
//       }
//       if (fileName) {
//         subTask.challanPhoto = `/uploads/${fileName}`;   // back to challanPhoto
//         fileToDelete = path.join(__dirname, '..', 'uploads', fileName);
//       }
//     }

//     const updatedTask = await taskService.addSubTask(taskId, subTask);
//     res.json({ success: true, data: updatedTask });
//   } catch (error) {
//     if (fileToDelete && fs.existsSync(fileToDelete)) {
//       try { fs.unlinkSync(fileToDelete); } catch {/* ignore */}
//     }
//     res.status(400).json({ success: false, message: error.message });
//   }
// }

async function addSubTaskController(req, res) {
  let fileToDelete = null;
  try {
    const { taskId } = req.params;
    const subTask = req.body;

    if (subTask.locationStatus !== undefined) {
      const allowedStatuses = ['warehouse', 'missing'];
      if (!allowedStatuses.includes(subTask.locationStatus)) {
        return res.status(400).json({ success: false, message: "Invalid 'locationStatus' value. Must be 'warehouse' or 'missing'." });
      }
    }

    if (req.file) {
      let fileName = req.file.filename;
      if (!fileName && req.file.originalname) {
        fileName = req.file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
      }
      if (fileName) {
        subTask.challanPhoto = `/uploads/${fileName}`;
        fileToDelete = path.join(__dirname, '..', 'uploads', fileName);
      }
    }

    const updatedTask = await taskService.addSubTask(taskId, subTask);
    res.json({ success: true, data: updatedTask });
  } catch (error) {
    if (fileToDelete && fs.existsSync(fileToDelete)) {
      try { fs.unlinkSync(fileToDelete); } catch {}
    }
    res.status(400).json({ success: false, message: error.message });
  }
}

async function editSubTaskController(req, res) {
  let fileToDelete = null;
  try {
    const { taskId, subTaskIndex } = req.params;
    const updateData = req.body;

    if (updateData.locationStatus !== undefined) {
      const allowedStatuses = ['warehouse', 'missing'];
      if (!allowedStatuses.includes(updateData.locationStatus)) {
        return res.status(400).json({ success: false, message: "Invalid 'locationStatus' value. Must be 'warehouse' or 'missing'." });
      }
    }

    if (req.file) {
      let fileName = req.file.filename;
      if (!fileName && req.file.originalname) {
        fileName = req.file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
      }
      if (fileName) {
        updateData.challanPhoto = `/uploads/${fileName}`;   // back to challanPhoto
        fileToDelete = path.join(__dirname, '..', 'uploads', fileName);
      }
    }

    const updatedTask = await taskService.editSubTask(taskId, parseInt(subTaskIndex, 10), updateData);
    res.json({ success: true, data: updatedTask });
  } catch (error) {
    if (fileToDelete && fs.existsSync(fileToDelete)) {
      try { fs.unlinkSync(fileToDelete); } catch {/* ignore */}
    }
    res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * Controller to fetch subTasks for a TaskRecord.
 */
async function fetchSubTasksController(req, res) {
  try {
    const { taskId, subTaskIndex } = req.params;
    const subTasks = await taskService.fetchSubTasks(
      taskId,
      subTaskIndex !== undefined ? parseInt(subTaskIndex, 10) : undefined
    );
    res.json({ success: true, data: subTasks });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}


/**
 * Controller to delete a subTask by index from a TaskRecord.
 */
async function deleteSubTaskController(req, res) {
  try {
    const { taskId, subTaskIndex } = req.params;
    const updatedTask = await taskService.deleteSubTask(taskId, parseInt(subTaskIndex, 10));
    res.json({ success: true, data: updatedTask });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}



/**
 * Controller to ADD a new submission to a subTask.
 *
 * Adds support for 'locationStatus' (enum: 'warehouse' | 'missing') on submission (see TaskRecord.js 44-48).
 */
async function addSubmissionToSubTaskController(req, res) {
  let fileToDelete = null;

  try {
    const { taskId, subTaskId } = req.params;
    const submissionData = req.body;
    let imageFile = null;

    // Ensure correct value for locationStatus ('warehouse' or 'missing') if present
    if (submissionData.locationStatus !== undefined) {
      const allowedStatuses = ['warehouse', 'missing'];
      if (!allowedStatuses.includes(submissionData.locationStatus)) {
        return res.status(400).json({ success: false, message: "Invalid 'locationStatus' value. Must be 'warehouse' or 'missing'." });
      }
    }

    if (req.file) {
      const fileName = req.file.filename ||
        req.file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');

      if (fileName) {
        submissionData.challanPhotoPath = `/uploads/${fileName}`;
        fileToDelete = path.join(__dirname, '..', 'uploads', fileName);
      }
      imageFile = req.file;
    }

    const savedSubmission = await taskService.addSubmissionToSubTask(
      taskId,
      subTaskId,
      submissionData,
      imageFile
    );
    res.json({ success: true, data: savedSubmission });
  } catch (error) {
    if (fileToDelete) {
      fs.unlink(fileToDelete, err => {
        if (err) console.error('Failed to delete uploaded file after error:', fileToDelete, err);
      });
    }
    res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * Controller to EDIT an existing submission for a subTask.
 * Adds support for updating 'locationStatus' (warehouse/missing).
 */
async function editSubmissionOfSubTaskController(req, res) {
  let fileToDelete = null;

  try {
    const { taskId, subTaskId } = req.params;
    const submissionData = req.body;

    // Validate the new locationStatus if present
    if (submissionData.locationStatus !== undefined) {
      const allowedStatuses = ['warehouse', 'missing'];
      if (!allowedStatuses.includes(submissionData.locationStatus)) {
        return res.status(400).json({ success: false, message: "Invalid 'locationStatus' value. Must be 'warehouse' or 'missing'." });
      }
    }

    const rawIndex = req.query.submissionIndex;
    const submissionIndex = rawIndex !== undefined ? parseInt(rawIndex, 10) : undefined;

    if (submissionIndex === undefined || isNaN(submissionIndex)) {
      return res.status(400).json({ success: false, message: 'submissionIndex query param is required' });
    }

    let imageFile = null;

    if (req.file) {
      const fileName = req.file.filename ||
        req.file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');

      if (fileName) {
        submissionData.challanPhotoPath = `/uploads/${fileName}`;
        fileToDelete = path.join(__dirname, '..', 'uploads', fileName);
      }
      imageFile = req.file;
    }

    const updatedSubmission = await taskService.editSubmissionOfSubTask(
      taskId,
      subTaskId,
      submissionIndex,
      submissionData,
      imageFile
    );
    res.json({ success: true, data: updatedSubmission });
  } catch (error) {
    if (fileToDelete) {
      fs.unlink(fileToDelete, err => {
        if (err) console.error('Failed to delete uploaded file after error:', fileToDelete, err);
      });
    }
    res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * Controller to DELETE a specific submission from a subTask.
 */
async function deleteSubmissionOfSubTaskController(req, res) {
  try {
    const { taskId, subTaskId } = req.params;

    const rawIndex = req.query.submissionIndex;
    const submissionIndex = rawIndex !== undefined ? parseInt(rawIndex, 10) : undefined;

    if (submissionIndex === undefined || isNaN(submissionIndex)) {
      return res.status(400).json({ success: false, message: 'submissionIndex query param is required' });
    }

    const updatedSubTask = await taskService.deleteSubmissionOfSubTask(taskId, subTaskId, submissionIndex);
    res.json({ success: true, data: updatedSubTask });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}


/**
 * Controller to fetch submission(s) for a subTask.
 */
async function fetchSubmissionOfSubTaskController(req, res) {
  try {
    const { taskId, subTaskId } = req.params;
    const submission = await taskService.fetchSubmissionOfSubTask(taskId, subTaskId);
    res.json({ success: true, data: submission });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}


module.exports = {

  fetchDashboardFabricStatsController,

  fetchTaskDataSchemaFieldsController,
  createTasksController,
  editTaskController,
  fetchTasksController,
  fetchTaskByTaskIdController,
  deleteTaskController,

  fetchTasksWithPendingSubTasksController,

  addSubTaskController,
  editSubTaskController,
  fetchSubTasksController,
  deleteSubTaskController,

  addSubmissionToSubTaskController,
  editSubmissionOfSubTaskController,
  fetchSubmissionOfSubTaskController,
  deleteSubmissionOfSubTaskController,
};