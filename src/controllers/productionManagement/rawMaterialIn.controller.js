const rawMaterialInService = require('../../services/productionManagement/rawMaterialIn.service');
const fs = require('fs');
const path = require('path');

function storedPathFor(file) {
  if (!file) return null;
  const fileName = file.filename || (file.originalname || '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
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

async function createRawMaterialInController(req, res) {
  const filesToDelete = [];
  try {
    const files = {};
    if (req.file) {
      files.chPhotoPath = storedPathFor(req.file);
      filesToDelete.push(fileDeletePath(req.file));
    }
    const created = await rawMaterialInService.createRawMaterialIn(req.body, files);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    filesToDelete.forEach(safeUnlink);
    res.status(400).json({ success: false, message: error.message });
  }
}

async function editRawMaterialInController(req, res) {
  const filesToDelete = [];
  try {
    const files = {};
    if (req.file) {
      files.chPhotoPath = storedPathFor(req.file);
      filesToDelete.push(fileDeletePath(req.file));
    }
    const updated = await rawMaterialInService.editRawMaterialIn(req.params.recordId, req.body, files);
    res.json({ success: true, data: updated });
  } catch (error) {
    filesToDelete.forEach(safeUnlink);
    res.status(400).json({ success: false, message: error.message });
  }
}

async function fetchRawMaterialInsController(req, res) {
  try {
    const result = await rawMaterialInService.fetchRawMaterialIns(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function fetchRawMaterialInByIdController(req, res) {
  try {
    const record = await rawMaterialInService.fetchRawMaterialInById(req.params.recordId);
    if (!record) return res.status(404).json({ success: false, message: 'Record not found.' });
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function deleteRawMaterialInController(req, res) {
  try {
    const deleted = await rawMaterialInService.deleteRawMaterialIn(req.params.recordId);
    if (!deleted) return res.status(404).json({ success: false, message: 'Record not found.' });
    res.json({ success: true, data: deleted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  createRawMaterialInController,
  editRawMaterialInController,
  fetchRawMaterialInsController,
  fetchRawMaterialInByIdController,
  deleteRawMaterialInController,
};
