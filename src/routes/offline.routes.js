const express = require('express');
const router = express.Router();

const {
  addOfflineRecord,
  editOfflineRecord,
  deleteOfflineRecord,
  fetchOfflineRecords,
  getOfflineRecordById,
  fetchOfflineRecordsForExport,
} = require('../controllers/offline.controller');

// Add a new OfflineRecord
router.post('/', addOfflineRecord);

// Edit an existing OfflineRecord
router.put('/:id', editOfflineRecord);

// Delete an OfflineRecord by ID
router.delete('/:id', deleteOfflineRecord);

// Get a paginated list of OfflineRecords
router.get('/', fetchOfflineRecords);

// Get a single OfflineRecord by ID
router.get('/:id', getOfflineRecordById);

// Fetch all OfflineRecords for export (no pagination, with filters)
router.get('/export/all', fetchOfflineRecordsForExport);

module.exports = router;