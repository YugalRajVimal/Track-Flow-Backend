const offlineService = require('../services/offline.service');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * Add a new OfflineRecord
 */
const addOfflineRecord = async (req, res) => {
  try {
    const newRecord = await offlineService.addOfflineRecord(req.body);
    return sendSuccess(res, 201, 'Offline record created successfully', newRecord);
  } catch (err) {
    return sendError(res, err.statusCode || 400, err.message || 'Failed to create offline record');
  }
};

/**
 * Edit an existing OfflineRecord
 */
const editOfflineRecord = async (req, res) => {
    
  try {
    const { id } = req.params;
    const updatedRecord = await offlineService.editOfflineRecord(id, req.body);
    return sendSuccess(res, 200, 'Offline record updated successfully', updatedRecord);
  } catch (err) {
    return sendError(res, err.statusCode || 404, err.message || 'Failed to update offline record');
  }
};

/**
 * Delete an OfflineRecord by ID
 */
const deleteOfflineRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await offlineService.deleteOfflineRecord(id);
    return sendSuccess(res, 200, 'Offline record deleted successfully', result);
  } catch (err) {
    return sendError(res, err.statusCode || 404, err.message || 'Failed to delete offline record');
  }
};

/**
 * Get a paginated list of OfflineRecords
 */
const fetchOfflineRecords = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      payment = '',
      startDate = '',
      endDate = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      partyName='',
    } = req.query;

    const { records, pagination } = await offlineService.fetchOfflineRecords({
      page,
      limit,
      search,
      payment,
      startDate,
      endDate,
      sortBy,
      sortOrder,
      partyName
    });

    return sendSuccess(res, 200, 'Offline records fetched successfully', records, pagination);
  } catch (err) {
    return sendError(res, err.statusCode || 500, err.message || 'Failed to fetch offline records');
  }
};

/**
 * Get a single OfflineRecord by ID
 */
const getOfflineRecordById = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await offlineService.getOfflineRecordById(id);
    return sendSuccess(res, 200, 'Offline record fetched successfully', record);
  } catch (err) {
    return sendError(res, err.statusCode || 404, err.message || 'Failed to get offline record');
  }
};

/**
 * Fetch all OfflineRecords for export (no pagination, with filters)
 */
const fetchOfflineRecordsForExport = async (req, res) => {
  try {
    const {
      search = '',
      payment = '',
      startDate = '',
      endDate = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const records = await offlineService.fetchOfflineRecordsForExport({
      search,
      payment,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    });

    return sendSuccess(res, 200, 'Offline records export fetched successfully', records);
  } catch (err) {
    return sendError(res, err.statusCode || 500, err.message || 'Failed to fetch offline records for export');
  }
};

module.exports = {
  addOfflineRecord,
  editOfflineRecord,
  deleteOfflineRecord,
  fetchOfflineRecords,
  getOfflineRecordById,
  fetchOfflineRecordsForExport,
};