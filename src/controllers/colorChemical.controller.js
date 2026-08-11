

const path = require('path');
const fs = require('fs');

const {
  addColorChemical,
  editColorChemical,
  fetchColorChemicals,
  fetchColorChemicalById,
  deleteColorChemical,
} = require('../services/colorChemical.service');
const { UPLOADS_DIR } = require('../middleware/imageUploadMiddlware');

/**
 * Helper: delete a file from disk safely (non-throwing).
 */
function safeUnlink(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch { /* ignore */ }
  }
}

/**
 * POST /color-chemicals
 * Create a new ColorChemical record with optional challan photo.
 */
async function createColorChemical(req, res) {
  const uploadedFilePath = req.file ? path.join(UPLOADS_DIR, req.file.filename) : null;
  try {
    const data = { ...req.body };

    if (req.file) {
      // BUG FIX: was assigning to data.photoPath — schema field is challanPhotoUpload
      data.challanPhotoUpload = `/uploads/${req.file.filename}`;
    }

    const colorChemical = await addColorChemical(data);
    res.status(201).json({ success: true, data: colorChemical });
  } catch (error) {
    // Roll back the uploaded file if DB save failed
    safeUnlink(uploadedFilePath);
    res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * PUT /color-chemicals/:id
 * Update an existing ColorChemical; replaces photo if a new file is uploaded.
 */
async function updateColorChemical(req, res) {
  const uploadedFilePath = req.file ? path.join(UPLOADS_DIR, req.file.filename) : null;
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (req.file) {
      // BUG FIX: was assigning to updateData.photoPath — schema field is challanPhotoUpload
      updateData.challanPhotoUpload = `/uploads/${req.file.filename}`;
    }

    // Fetch the existing record so we can clean up its old photo after a successful update
    const existing = await fetchColorChemicalById(id);
    if (!existing) {
      safeUnlink(uploadedFilePath);
      return res.status(404).json({ success: false, message: 'ColorChemical not found' });
    }

    const updated = await editColorChemical(id, updateData);

    // BUG FIX: old photo was never deleted from disk when replaced — now it is
    if (req.file && existing.challanPhotoUpload) {
      const oldFileName = path.basename(existing.challanPhotoUpload);
      safeUnlink(path.join(UPLOADS_DIR, oldFileName));
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    safeUnlink(uploadedFilePath);
    res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * GET /color-chemicals
 * Return a paginated list of ColorChemicals, supports text search filters.
 */
async function getColorChemicals(req, res) {
  try {
    // Extract pagination & sort options
    const options = {
      skip: parseInt(req.query.skip, 10) || 0,
      limit: parseInt(req.query.limit, 10) || 50,
      sort: req.query.sort ? JSON.parse(req.query.sort) : { createdAt: -1 },
    };

    // Build filter object for text and exact search
    const filter = {};
    if (req.query.receiverName) filter.receiverName = req.query.receiverName;
    if (req.query.shopName) filter.shopName = req.query.shopName;
    if (req.query.challanNo) filter.challanNo = req.query.challanNo;

    // Allow other filters (e.g. for future extensibility)
    for (const key of Object.keys(req.query)) {
      if (!['skip', 'limit', 'sort', 'receiverName', 'shopName', 'challanNo'].includes(key) && req.query[key] !== undefined && req.query[key] !== '') {
        filter[key] = req.query[key];
      }
    }

    const colorChemicals = await fetchColorChemicals(filter, options);
    res.json(colorChemicals);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

/**
 * GET /color-chemicals/:id
 */
async function getColorChemicalById(req, res) {
  try {
    const colorChemical = await fetchColorChemicalById(req.params.id);
    if (!colorChemical) {
      return res.status(404).json({ error: 'ColorChemical not found' });
    }
    res.json(colorChemical);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

/**
 * DELETE /color-chemicals/:id
 * Deletes the record and its associated photo from disk.
 */
async function removeColorChemical(req, res) {
  try {
    const deleted = await deleteColorChemical(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'ColorChemical not found' });
    }
    // Clean up photo file from disk
    if (deleted.challanPhotoUpload) {
      const oldFileName = path.basename(deleted.challanPhotoUpload);
      safeUnlink(path.join(UPLOADS_DIR, oldFileName));
    }
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

module.exports = {
  createColorChemical,
  updateColorChemical,
  getColorChemicals,
  getColorChemicalById,
  removeColorChemical,
};