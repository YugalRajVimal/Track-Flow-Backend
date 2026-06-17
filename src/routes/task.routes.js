const express = require('express');
const router = express.Router();

const {
  createTasksController,
  editTaskController,
  fetchTasksController,
  deleteTaskController,
  fetchTaskDataSchemaFieldsController,
  addSubTaskController,
  editSubTaskController,
  fetchSubTasksController,
  deleteSubTaskController,
  fetchTaskByTaskIdController,
  addSubmissionToSubTaskController,
  editSubmissionOfSubTaskController,
  fetchSubmissionOfSubTaskController,
  deleteSubmissionOfSubTaskController,
} = require('../controllers/task.controller');

// Route to fetch task data schema config fields (dropdown options, etc.)
router.get('/dropdowns', fetchTaskDataSchemaFieldsController);

// Create one or multiple tasks
router.post('/', createTasksController);

// Edit/update a task by ID
router.put('/:taskId', editTaskController);

// Fetch single or multiple tasks
router.get('/', fetchTasksController);

// Fetch a specific task by taskId as a query parameter (e.g., /api/tasks?taskId=1)
router.get('/by-task-id', fetchTaskByTaskIdController);


// Delete a task by ID
router.delete('/:taskId', deleteTaskController);

// SubTask routes
// Add a subTask to a TaskRecord
router.post('/:taskId/subtasks', addSubTaskController);

// Edit/update a subTask of a TaskRecord by subTaskIndex
router.put('/:taskId/subtasks/:subTaskIndex', editSubTaskController);

// Fetch all subTasks or a specific subTask (if subTaskIndex is provided) for a TaskRecord
router.get('/:taskId/subtasks/:subTaskIndex?', fetchSubTasksController);

// Delete a subTask by subTaskIndex from a TaskRecord
router.delete('/:taskId/subtasks/:subTaskIndex', deleteSubTaskController);



// Add (create/upsert) a submission to a subTask
router.post('/:taskId/subtasks/:subTaskId/submission', addSubmissionToSubTaskController);

// Edit/update a submission for a subTask
router.put('/:taskId/subtasks/:subTaskId/submission', editSubmissionOfSubTaskController);

// Fetch a submission for a subTask
router.get('/:taskId/subtasks/:subTaskId/submission', fetchSubmissionOfSubTaskController);

// Delete a submission from a subTask
router.delete('/:taskId/subtasks/:subTaskId/submission', deleteSubmissionOfSubTaskController);



module.exports = router;