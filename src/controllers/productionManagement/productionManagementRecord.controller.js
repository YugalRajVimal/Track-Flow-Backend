


// const recordService = require('../../services/productionManagement/productionManagementRecord.service');
// const fs = require('fs');
// const path = require('path');
 
// // ── Helper: normalize an uploaded file into a stored path ──────────────────
// function storedPathFor(file) {
//   if (!file) return null;
//   let fileName = file.filename;
//   if (!fileName && file.originalname) {
//     fileName = file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
//   }
//   return fileName ? `/uploads/${fileName}` : null;
// }
 
// function fileDeletePath(file) {
//   if (!file) return null;
//   const fileName = file.filename || (file.originalname || '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
//   return fileName ? path.join(__dirname, '..', '..', 'uploads', fileName) : null;
// }
 
// function safeUnlink(filePath) {
//   if (filePath && fs.existsSync(filePath)) {
//     try { fs.unlinkSync(filePath); } catch { /* ignore */ }
//   }
// }
 
// // ─────────────────────────────────────────────────────────────────────────
// // Create
// // ─────────────────────────────────────────────────────────────────────────
 
// /**
//  * POST /builty-in  — expects multipart with fields[supplierBillPhoto], fields[dyerReceiverChPhoto]
//  * POST /ready-fabric — expects multipart with fields[chPhoto]
//  * Multer should be configured with .fields([...]) upstream for these two file slots per type.
//  */
// async function createBuiltyInController(req, res) {
//   const filesToDelete = [];
//   try {
//     const files = {};
//     if (req.files?.supplierBillPhoto?.[0]) {
//       files.supplierBillPhotoPath = storedPathFor(req.files.supplierBillPhoto[0]);
//       filesToDelete.push(fileDeletePath(req.files.supplierBillPhoto[0]));
//     }
//     if (req.files?.dyerReceiverChPhoto?.[0]) {
//       files.dyerReceiverChPhotoPath = storedPathFor(req.files.dyerReceiverChPhoto[0]);
//       filesToDelete.push(fileDeletePath(req.files.dyerReceiverChPhoto[0]));
//     }
 
//     const created = await recordService.createTask('BuiltyIn', req.body, files);
//     res.status(201).json({ success: true, data: created });
//   } catch (error) {
//     filesToDelete.forEach(safeUnlink);
//     res.status(400).json({ success: false, message: error.message });
//   }
// }
 
// async function createReadyFabricController(req, res) {
//   const filesToDelete = [];
//   try {
//     const files = {};
//     if (req.files?.chPhoto?.[0]) {
//       files.chPhotoPath = storedPathFor(req.files.chPhoto[0]);
//       filesToDelete.push(fileDeletePath(req.files.chPhoto[0]));
//     }
 
//     const created = await recordService.createTask('ReadyFabric', req.body, files);
//     res.status(201).json({ success: true, data: created });
//   } catch (error) {
//     filesToDelete.forEach(safeUnlink);
//     res.status(400).json({ success: false, message: error.message });
//   }
// }
 
// // ─────────────────────────────────────────────────────────────────────────
// // Edit / Fetch / Delete
// // ─────────────────────────────────────────────────────────────────────────
 
// async function editTaskController(req, res) {
//   const filesToDelete = [];
//   try {
//     const { taskId } = req.params;
//     const files = {};
//     if (req.files?.supplierBillPhoto?.[0]) {
//       files.supplierBillPhotoPath = storedPathFor(req.files.supplierBillPhoto[0]);
//       filesToDelete.push(fileDeletePath(req.files.supplierBillPhoto[0]));
//     }
//     if (req.files?.dyerReceiverChPhoto?.[0]) {
//       files.dyerReceiverChPhotoPath = storedPathFor(req.files.dyerReceiverChPhoto[0]);
//       filesToDelete.push(fileDeletePath(req.files.dyerReceiverChPhoto[0]));
//     }
//     if (req.files?.chPhoto?.[0]) {
//       files.chPhotoPath = storedPathFor(req.files.chPhoto[0]);
//       filesToDelete.push(fileDeletePath(req.files.chPhoto[0]));
//     }
 
//     const updated = await recordService.editTask(taskId, req.body, files);
//     res.json({ success: true, data: updated });
//   } catch (error) {
//     filesToDelete.forEach(safeUnlink);
//     res.status(400).json({ success: false, message: error.message });
//   }
// }
 
// async function fetchTasksController(req, res) {
//   try {
//     const result = await recordService.fetchTasks(req.query);
//     res.json({ success: true, ...result });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// }
 
// async function fetchTaskByTaskIdController(req, res) {
//   try {
//     const taskId = req.params.taskId || req.query.taskId;
//     if (!taskId) return res.status(400).json({ success: false, message: 'taskId is required' });
//     const task = await recordService.fetchByTaskId(taskId);
//     if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
//     res.json({ success: true, data: task });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// }
 
// async function deleteTaskController(req, res) {
//   try {
//     const { taskId } = req.params;
//     const deleted = await recordService.deleteTask(taskId);
//     if (!deleted) return res.status(404).json({ success: false, message: 'Task not found' });
//     res.json({ success: true, data: deleted });
//   } catch (error) {
//     res.status(400).json({ success: false, message: error.message });
//   }
// }
 
// // ─────────────────────────────────────────────────────────────────────────
// // Builty In → Verification (passcode gated)
// // ─────────────────────────────────────────────────────────────────────────
 
// async function verifyBuiltyInController(req, res) {
//   try {
//     const { taskId } = req.params;
//     const { passcode, mtrShort, fabricQuality, remark } = req.body;
//     const userId = req.user._id;
//     const updated = await recordService.verifyBuiltyIn(taskId, { userId, passcode, mtrShort, fabricQuality, remark });
//     res.json({ success: true, data: updated });
//   } catch (error) {
//     if (error.message === 'Wrong passcode.') {
//       // Send clear/consistent error for wrong passcode specifically
//       return res.status(401).json({ success: false, message: 'Wrong passcode for user.' });
//     }
//     res.status(400).json({ success: false, message: error.message });
//   }
// }
 
// // ─────────────────────────────────────────────────────────────────────────
// // Ready Fabric → Done / Returned (passcode gated)
// // ─────────────────────────────────────────────────────────────────────────
 
// async function updateReadyFabricStatusController(req, res) {
//   try {
//     const { taskId } = req.params;
//     const { passcode, status, jobRate, remark, mtrShort } = req.body;
//     const userId = req.user._id;
//     const updated = await recordService.updateReadyFabricStatus(taskId, { userId, passcode, status, jobRate, remark, mtrShort });
//     res.json({ success: true, data: updated });
//   } catch (error) {
//     res.status(400).json({ success: false, message: error.message });
//   }
// }
 
// // ─────────────────────────────────────────────────────────────────────────
// // Page 2 — Cutting
// // ─────────────────────────────────────────────────────────────────────────
 
// async function fetchReadyFabricDoneController(req, res) {
//   try {
//     const result = await recordService.fetchReadyFabricDoneRecords(req.query);
//     res.json({ success: true, ...result });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// }
 
// async function previewCuttingController(req, res) {
//   try {
//     const { taskId } = req.params;
//     const { styleCutting } = req.query;
//     if (!styleCutting) return res.status(400).json({ success: false, message: 'styleCutting is required' });
//     const preview = await recordService.previewCutting(taskId, styleCutting);
//     res.json({ success: true, data: preview });
//   } catch (error) {
//     res.status(400).json({ success: false, message: error.message });
//   }
// }
 
// async function submitCuttingController(req, res) {
//   const filesToDelete = [];
//   try {
//     const { taskId } = req.params;
//     let { styleCutting, sizes, cuttingMasterName, remark, userId, date } = req.body;
//     if (typeof sizes === 'string') sizes = JSON.parse(sizes);
 
//     let cuttingRegisterPhoto;
//     if (req.file) {
//       cuttingRegisterPhoto = storedPathFor(req.file);
//       filesToDelete.push(fileDeletePath(req.file));
//     }
 
//     const updated = await recordService.submitCutting(taskId, {
//       userId, styleCutting, sizes, cuttingRegisterPhoto, cuttingMasterName, remark, date,
//     });
//     res.json({ success: true, data: updated });
//   } catch (error) {
//     filesToDelete.forEach(safeUnlink);
//     res.status(400).json({ success: false, message: error.message });
//   }
// }
 
// // ─────────────────────────────────────────────────────────────────────────
// // Page 3 — Fabricator / Dispatch (multi-fabricator, partial receiving)
// // ─────────────────────────────────────────────────────────────────────────
 
// async function fetchFabricatorPoolController(req, res) {
//   try {
//     const { taskId } = req.params;
//     const pool = await recordService.fetchUnassignedPool(taskId);
//     res.json({ success: true, data: pool });
//   } catch (error) {
//     res.status(400).json({ success: false, message: error.message });
//   }
// }
 
// async function assignFabricatorController(req, res) {
//   const filesToDelete = [];
//   try {
//     const { taskId } = req.params;
//     const { fabricatorName, styleCutting, ratePerPiece, date } = req.body;
//     let { assignedSizes } = req.body;
//     if (typeof assignedSizes === 'string') assignedSizes = JSON.parse(assignedSizes);
 
//     let fabricatorReceiverChPhoto;
//     if (req.file) {
//       fabricatorReceiverChPhoto = storedPathFor(req.file);
//       filesToDelete.push(fileDeletePath(req.file));
//     }
 
//     const updated = await recordService.assignFabricator(taskId, {
//       fabricatorName, fabricatorReceiverChPhoto, styleCutting, assignedSizes, ratePerPiece, date,
//     });
//     res.json({ success: true, data: updated });
//   } catch (error) {
//     filesToDelete.forEach(safeUnlink);
//     res.status(400).json({ success: false, message: error.message });
//   }
// }
 
// async function addFabricatorReceivingController(req, res) {
//   const filesToDelete = [];
//   try {
//     const { taskId, fabricatorId } = req.params;
//     let {  passcode, receiverName, receivedSizes, date } = req.body;
//     const userId = req.user._id;
//     if (typeof receivedSizes === 'string') receivedSizes = JSON.parse(receivedSizes);
 
//     let receivingEntryPhoto;
//     if (req.file) {
//       receivingEntryPhoto = storedPathFor(req.file);
//       filesToDelete.push(fileDeletePath(req.file));
//     }
 
//     const updated = await recordService.addFabricatorReceiving(taskId, fabricatorId, {
//       userId, passcode, receivedSizes, receiverName, receivingEntryPhoto, date,
//     });
//     res.json({ success: true, data: updated });
//   } catch (error) {
//     filesToDelete.forEach(safeUnlink);
//     res.status(400).json({ success: false, message: error.message });
//   }
// }
 
// module.exports = {
//   createBuiltyInController,
//   createReadyFabricController,
//   editTaskController,
//   fetchTasksController,
//   fetchTaskByTaskIdController,
//   deleteTaskController,
//   verifyBuiltyInController,
//   updateReadyFabricStatusController,
//   fetchReadyFabricDoneController,
//   previewCuttingController,
//   submitCuttingController,
//   fetchFabricatorPoolController,
//   assignFabricatorController,
//   addFabricatorReceivingController,
// };
 

const recordService = require('../../services/productionManagement/productionManagementRecord.service');
const fs = require('fs');
const path = require('path');
 
// ── Helper: normalize an uploaded file into a stored path ──────────────────
function storedPathFor(file) {
  if (!file) return null;
  let fileName = file.filename;
  if (!fileName && file.originalname) {
    fileName = file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
  }
  return fileName ? `/uploads/${fileName}` : null;
}
 
function fileDeletePath(file) {
  if (!file) return null;
  const fileName = file.filename || (file.originalname || '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
  return fileName ? path.join(__dirname, '..', '..', 'uploads', fileName) : null;
}
 
function safeUnlink(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch { /* ignore */ }
  }
}
 
// ─────────────────────────────────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────────────────────────────────
 
/**
 * POST /builty-in  — expects multipart with fields[supplierBillPhoto], fields[dyerReceiverChPhoto]
 * POST /ready-fabric — expects multipart with fields[chPhoto]
 * Multer should be configured with .fields([...]) upstream for these two file slots per type.
 */
async function createBuiltyInController(req, res) {
  const filesToDelete = [];
  try {
    const files = {};
    if (req.files?.supplierBillPhoto?.[0]) {
      files.supplierBillPhotoPath = storedPathFor(req.files.supplierBillPhoto[0]);
      filesToDelete.push(fileDeletePath(req.files.supplierBillPhoto[0]));
    }
    if (req.files?.dyerReceiverChPhoto?.[0]) {
      files.dyerReceiverChPhotoPath = storedPathFor(req.files.dyerReceiverChPhoto[0]);
      filesToDelete.push(fileDeletePath(req.files.dyerReceiverChPhoto[0]));
    }
 
    const created = await recordService.createTask('BuiltyIn', req.body, files);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    filesToDelete.forEach(safeUnlink);
    res.status(400).json({ success: false, message: error.message });
  }
}
 
async function createReadyFabricController(req, res) {
  const filesToDelete = [];
  try {
    const files = {};
    if (req.files?.chPhoto?.[0]) {
      files.chPhotoPath = storedPathFor(req.files.chPhoto[0]);
      filesToDelete.push(fileDeletePath(req.files.chPhoto[0]));
    }
 
    const created = await recordService.createTask('ReadyFabric', req.body, files);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    filesToDelete.forEach(safeUnlink);
    res.status(400).json({ success: false, message: error.message });
  }
}
 
// ─────────────────────────────────────────────────────────────────────────
// Edit / Fetch / Delete
// ─────────────────────────────────────────────────────────────────────────
 
async function editTaskController(req, res) {
  const filesToDelete = [];
  try {
    const { taskId } = req.params;
    const files = {};
    if (req.files?.supplierBillPhoto?.[0]) {
      files.supplierBillPhotoPath = storedPathFor(req.files.supplierBillPhoto[0]);
      filesToDelete.push(fileDeletePath(req.files.supplierBillPhoto[0]));
    }
    if (req.files?.dyerReceiverChPhoto?.[0]) {
      files.dyerReceiverChPhotoPath = storedPathFor(req.files.dyerReceiverChPhoto[0]);
      filesToDelete.push(fileDeletePath(req.files.dyerReceiverChPhoto[0]));
    }
    if (req.files?.chPhoto?.[0]) {
      files.chPhotoPath = storedPathFor(req.files.chPhoto[0]);
      filesToDelete.push(fileDeletePath(req.files.chPhoto[0]));
    }
 
    const updated = await recordService.editTask(taskId, req.body, files);
    res.json({ success: true, data: updated });
  } catch (error) {
    filesToDelete.forEach(safeUnlink);
    res.status(400).json({ success: false, message: error.message });
  }
}
 
async function fetchTasksController(req, res) {
  try {
    const result = await recordService.fetchTasks(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
 
async function fetchPendingVerificationsController(req, res) {
  try {
    const result = await recordService.fetchPendingVerifications();
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function fetchDashboardStatsController(req, res) {
  try {
    const data = await recordService.fetchDashboardStats(req.query);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function fetchTaskByTaskIdController(req, res) {
  try {
    const taskId = req.params.taskId || req.query.taskId;
    if (!taskId) return res.status(400).json({ success: false, message: 'taskId is required' });
    const task = await recordService.fetchByTaskId(taskId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
 
async function deleteTaskController(req, res) {
  try {
    const { taskId } = req.params;
    const deleted = await recordService.deleteTask(taskId);
    if (!deleted) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: deleted });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}
 
// ─────────────────────────────────────────────────────────────────────────
// Builty In → Verification (passcode gated)
// ─────────────────────────────────────────────────────────────────────────
 
async function verifyBuiltyInController(req, res) {
  try {
    const { taskId } = req.params;
    const { passcode, mtrShort, fabricQuality, remark } = req.body;
    const userId = req.user._id;
    const updated = await recordService.verifyBuiltyIn(taskId, { userId, passcode, mtrShort, fabricQuality, remark });
    res.json({ success: true, data: updated });
  } catch (error) {
    if (error.message === 'Wrong passcode.') {
      // Send clear/consistent error for wrong passcode specifically
      return res.status(401).json({ success: false, message: 'Wrong passcode for user.' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
}
 
// ─────────────────────────────────────────────────────────────────────────
// Ready Fabric → Done / Returned (passcode gated)
// ─────────────────────────────────────────────────────────────────────────
 
async function updateReadyFabricStatusController(req, res) {
  try {
    const { taskId } = req.params;
    const { passcode, status, jobRate, remark, mtrShort } = req.body;
    const userId = req.user._id;
    const updated = await recordService.updateReadyFabricStatus(taskId, { userId, passcode, status, jobRate, remark, mtrShort });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}
 
// ─────────────────────────────────────────────────────────────────────────
// Page 2 — Cutting
// ─────────────────────────────────────────────────────────────────────────
 
async function fetchReadyFabricDoneController(req, res) {
  try {
    const result = await recordService.fetchReadyFabricDoneRecords(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
 
async function previewCuttingController(req, res) {
  try {
    const { taskId } = req.params;
    const { styleCutting } = req.query;
    if (!styleCutting) return res.status(400).json({ success: false, message: 'styleCutting is required' });
    const preview = await recordService.previewCutting(taskId, styleCutting);
    res.json({ success: true, data: preview });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}
 
async function submitCuttingController(req, res) {
  const filesToDelete = [];
  try {
    const { taskId } = req.params;
    let { styleCutting, sizes, cuttingMasterName, remark, userId, date } = req.body;
    if (typeof sizes === 'string') sizes = JSON.parse(sizes);
 
    let cuttingRegisterPhoto;
    if (req.file) {
      cuttingRegisterPhoto = storedPathFor(req.file);
      filesToDelete.push(fileDeletePath(req.file));
    }
 
    const updated = await recordService.submitCutting(taskId, {
      userId, styleCutting, sizes, cuttingRegisterPhoto, cuttingMasterName, remark, date,
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    filesToDelete.forEach(safeUnlink);
    res.status(400).json({ success: false, message: error.message });
  }
}
 
// ─────────────────────────────────────────────────────────────────────────
// Page 3 — Fabricator / Dispatch (multi-fabricator, partial receiving)
// ─────────────────────────────────────────────────────────────────────────
 
async function fetchFabricatorPoolController(req, res) {
  try {
    const { taskId } = req.params;
    const pool = await recordService.fetchUnassignedPool(taskId);
    res.json({ success: true, data: pool });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}
 
async function assignFabricatorController(req, res) {
  const filesToDelete = [];
  try {
    const { taskId } = req.params;
    const { fabricatorName, styleCutting, ratePerPiece, date } = req.body;
    let { assignedSizes } = req.body;
    if (typeof assignedSizes === 'string') assignedSizes = JSON.parse(assignedSizes);
 
    let fabricatorReceiverChPhoto;
    if (req.file) {
      fabricatorReceiverChPhoto = storedPathFor(req.file);
      filesToDelete.push(fileDeletePath(req.file));
    }
 
    const updated = await recordService.assignFabricator(taskId, {
      fabricatorName, fabricatorReceiverChPhoto, styleCutting, assignedSizes, ratePerPiece, date,
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    filesToDelete.forEach(safeUnlink);
    res.status(400).json({ success: false, message: error.message });
  }
}
 
async function addFabricatorReceivingController(req, res) {
  const filesToDelete = [];
  try {
    const { taskId, fabricatorId } = req.params;
    let {  passcode, receiverName, receivedSizes, date } = req.body;
    const userId = req.user._id;
    if (typeof receivedSizes === 'string') receivedSizes = JSON.parse(receivedSizes);
 
    let receivingEntryPhoto;
    if (req.file) {
      receivingEntryPhoto = storedPathFor(req.file);
      filesToDelete.push(fileDeletePath(req.file));
    }
 
    const updated = await recordService.addFabricatorReceiving(taskId, fabricatorId, {
      userId, passcode, receivedSizes, receiverName, receivingEntryPhoto, date,
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    filesToDelete.forEach(safeUnlink);
    res.status(400).json({ success: false, message: error.message });
  }
}
 
module.exports = {
  createBuiltyInController,
  createReadyFabricController,
  editTaskController,
  fetchTasksController,
  fetchTaskByTaskIdController,
  fetchPendingVerificationsController,
  fetchDashboardStatsController,
  deleteTaskController,
  verifyBuiltyInController,
  updateReadyFabricStatusController,
  fetchReadyFabricDoneController,
  previewCuttingController,
  submitCuttingController,
  fetchFabricatorPoolController,
  assignFabricatorController,
  addFabricatorReceivingController,
};