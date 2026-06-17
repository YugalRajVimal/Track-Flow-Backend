const taskService = require('../services/task.service');


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
 */
async function createTasksController(req, res) {
  try {
    const { groupData, taskDetails } = req.body;
    const createdTasks = await taskService.createTasks(groupData, taskDetails);
    res.status(201).json({ success: true, data: createdTasks });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * Controller to edit/update a task by taskId.
 * Expects req.params.taskId and req.body with updateData
 */
async function editTaskController(req, res) {
  try {
    const { taskId } = req.params;
    const updateData = req.body;
    const updatedTask = await taskService.editTask(taskId, updateData);
    res.json({ success: true, data: updatedTask });
  } catch (error) {
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
 * Expects req.params.taskId, req.params.subTaskId, and req.body with submissionData.
 */
async function addSubmissionToSubTaskController(req, res) {
  try {
    const { taskId, subTaskId } = req.params;
    const submissionData = req.body;
    const savedSubmission = await taskService.addSubmissionToSubTask(taskId, subTaskId, submissionData);
    res.json({ success: true, data: savedSubmission });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * Controller to edit/update submission for a subTask within a TaskRecord.
 * Expects req.params.taskId, req.params.subTaskId, and req.body with updated submissionData.
 */
async function editSubmissionOfSubTaskController(req, res) {
  try {
    const { taskId, subTaskId } = req.params;
    const submissionData = req.body;
    const updatedSubmission = await taskService.editSubmissionOfSubTask(taskId, subTaskId, submissionData);
    res.json({ success: true, data: updatedSubmission });
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