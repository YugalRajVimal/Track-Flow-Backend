const taskService = require('../services/task.service');
const fs = require('fs');
const path = require('path');


/**
 * Controller to fetch specific task data schema config fields.
 * Responds with the fields: partyName, transportName, fabricType, length, sinkage, recieverName
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
 * Expects req.body to have:
 *  - groupData: { challanNo, partyName, transportName, receiverName, remark, challanPhotoPath }
 *  - taskDetails: array of objects [{ FabricType, Length, BuiltyNo, MTR, sinkage, mtrAfterSinkage, totalRolls, taskStatus }]
 * If a file was uploaded via multer (handled by uploadImage), saves its path to groupData.challanPhotoPath.
 * If error, deletes uploaded file.
 */


async function createTasksController(req, res) {
  let fileToDelete = null;
  try {
    let { groupData, taskDetails } = req.body;

    // req.body fields may be strings if form-data, parse if needed
    if (typeof groupData === 'string') groupData = JSON.parse(groupData);
    if (typeof taskDetails === 'string') taskDetails = JSON.parse(taskDetails);

    // If a file is uploaded (e.g., a challan image), save its path
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
    // Delete uploaded file if present and error occurs
    if (fileToDelete && fs.existsSync(fileToDelete)) {
      try { fs.unlinkSync(fileToDelete); } catch {/* ignore */}
    }
    res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * Controller to edit/update a task by taskId.
 * Expects req.params.taskId and req.body with updateData. If file uploaded, save file path to updateData.
 * If error, deletes uploaded file.
 */
async function editTaskController(req, res) {
  let fileToDelete = null;
  try {
    const { taskId } = req.params;
    let updateData = req.body;

    // If sent as form-data, parse updateData if it's a string (for file uploads)
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
    // Delete uploaded file if present and error occurs
    if (fileToDelete && fs.existsSync(fileToDelete)) {
      try { fs.unlinkSync(fileToDelete); } catch {/* ignore */}
    }
    res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * Controller to fetch single or multiple tasks.
 * - If req.query.taskId is provided, fetch one; else support filter via query params.
 */
async function fetchTasksController(req, res) {
  try {
    // Use query params for filtering (including taskId for single fetch)
    const filter = { ...req.query };
    const result = await taskService.fetchTasks(filter);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Controller to fetch a task by its taskId.
 * Accepts either req.params.taskId or req.query.taskId to match client usage.
 * Responds:
 *   - 200 with the task (success: true) if found
 *   - 400 if no taskId is provided
 *   - 404 if the task is not found
 */
async function fetchTaskByTaskIdController(req, res) {
  try {
    // Support both route param or query param (for client: axios.get(`/api/tasks`, { params: { taskId } }))
    const taskId = req.params.taskId || req.query.taskId;
    if (!taskId) {
      return res.status(400).json({ success: false, message: "taskId is required" });
    }
    const task = await taskService.fetchByTaskId(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}


/**
 * Controller to delete a task by taskId.
 * Expects req.params.taskId
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


/**
 * Controller to add a subTask to a TaskRecord.
 * Expects req.params.taskId and req.body.subTask (object following subTaskSchema)
 */
async function addSubTaskController(req, res) {
  try {
    const { taskId } = req.params;
    const subTask = req.body;
    const updatedTask = await taskService.addSubTask(taskId, subTask);
    res.json({ success: true, data: updatedTask });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * Controller to edit/update a subTask for a TaskRecord.
 * Expects req.params.taskId, req.params.subTaskIndex, and req.body with updateData
 */
async function editSubTaskController(req, res) {
  try {
    const { taskId, subTaskIndex } = req.params;
    const updateData = req.body;
    const updatedTask = await taskService.editSubTask(
      taskId,
      parseInt(subTaskIndex, 10),
      updateData
    );
    res.json({ success: true, data: updatedTask });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * Controller to fetch subTasks for a TaskRecord.
 * If req.params.subTaskIndex is provided, fetch that subTask; else fetch all.
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
 * Expects req.params.taskId and req.params.subTaskIndex
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
 * Controller to add (create/upsert) submission for a subTask within a TaskRecord.
 * Handles uploaded image file via req.file if available, and saves its path.
 * Expects req.params.taskId, req.params.subTaskId, req.body with submissionData, and optionally req.file.
 * If an error occurs and a file was uploaded, deletes the uploaded file.
 */

async function addSubmissionToSubTaskController(req, res) {
  let fileName = null;
  let fileToDelete = null;

  try {
    const { taskId, subTaskId } = req.params;
    const submissionData = req.body;
    let imageFile = null;

    // Handle uploaded file: sanitize filename, store path
    if (req.file) {
      fileName = req.file.filename;
      if (!fileName && req.file.originalname) {
        // Sanitize the original name if multer didn't already
        fileName = req.file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
      }
      if (fileName) {
        // Attach relative path info (so service layer can use it)
        submissionData.photoPath = `/uploads/${fileName}`;
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
    // If upload happened but error thrown, delete the uploaded file
    if (fileToDelete) {
      fs.unlink(fileToDelete, err => {
        if (err) {
          console.error('Failed to delete uploaded file after error:', fileToDelete, err);
        }
      });
    }
    res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * Controller to edit/update submission for a subTask within a TaskRecord.
 * Handles uploaded image file via req.file if available, and saves its path.
 * Expects req.params.taskId, req.params.subTaskId, req.body with updated submissionData, and optionally req.file.
 * If an error occurs and a file was uploaded, deletes the uploaded file.
 */
async function editSubmissionOfSubTaskController(req, res) {
  let fileName = null;
  let fileToDelete = null;

  try {
    const { taskId, subTaskId } = req.params;
    const submissionData = req.body;
    let imageFile = null;

    if (req.file) {
      fileName = req.file.filename;
      if (!fileName && req.file.originalname) {
        fileName = req.file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
      }
      if (fileName) {
        submissionData.photoPath = `/uploads/${fileName}`;
        fileToDelete = path.join(__dirname, '..', 'uploads', fileName);
      }
      imageFile = req.file;
    }

    const updatedSubmission = await taskService.editSubmissionOfSubTask(
      taskId,
      subTaskId,
      submissionData,
      imageFile
    );
    res.json({ success: true, data: updatedSubmission });
  } catch (error) {
    if (fileToDelete) {
      fs.unlink(fileToDelete, err => {
        if (err) {
          console.error('Failed to delete uploaded file after error:', fileToDelete, err);
        }
      });
    }
    res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * Controller to delete submission from a subTask within a TaskRecord.
 * Expects req.params.taskId and req.params.subTaskId.
 */
async function deleteSubmissionOfSubTaskController(req, res) {
  try {
    const { taskId, subTaskId } = req.params;
    const updatedSubTask = await taskService.deleteSubmissionOfSubTask(taskId, subTaskId);
    res.json({ success: true, data: updatedSubTask });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}



/**
 * Controller to fetch submission for a subTask within a TaskRecord.
 * Expects req.params.taskId and req.params.subTaskId.
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
    fetchTaskDataSchemaFieldsController,
  createTasksController,
  editTaskController,
  fetchTasksController,
  fetchTaskByTaskIdController,
  deleteTaskController,
  addSubTaskController,
  editSubTaskController,
  fetchSubTasksController,
  deleteSubTaskController,

  addSubmissionToSubTaskController,
  editSubmissionOfSubTaskController,
  fetchSubmissionOfSubTaskController,
  deleteSubmissionOfSubTaskController
};