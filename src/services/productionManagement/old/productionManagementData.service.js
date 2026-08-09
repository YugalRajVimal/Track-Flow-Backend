const TaskData = require('../../models/production-management/ProductionMangementData');

/**
 * Helper function to ensure array fields contain only strings or numbers as appropriate.
 * @param {any[]} arr
 * @param {'string'|'number'} type
 * @returns {string[]|number[]}
 */
function ensureArray(arr, type = 'string') {
  if (!Array.isArray(arr)) {
    return [];
  }
  return arr.map(val => {
    if (typeof val === 'object' && val !== null && 'name' in val) {
      return type === 'number' ? Number(val.name) : String(val.name);
    }
    return type === 'number' ? Number(val) : String(val);
  });
}

/**
 * Fetches the most recent production management data dropdown values.
 * @returns {Promise<Object>} An object containing arrays for each dropdown value and counters.
 */
async function getTaskDataDropdownValues() {
  try {
    console.log('[ProductionManagementDataService] Fetching latest dropdown values');
    const taskData = await TaskData.findOne({}, {}, { sort: { createdAt: -1 } });
    if (!taskData) {
      console.log('[ProductionManagementDataService] No data found. Returning initial structure.');
      return {
        taskIdCounter: 0,
        builtyIdCounter: 0,
        fabricSupplier: [],
        length: [],
        fabricType: [],
        fabricQuality: [],
        dyerName: [],
        sinkage: [],
        styleName: [],
        printType: [],
        styleCutting: [],
        cuttingMasterName: [],
        fabricatorName: [],
        receiverName: [],
      };
    }
    console.log('[ProductionManagementDataService] Found TaskData:', taskData._id);
    return {
      taskIdCounter: typeof taskData.taskIdCounter === 'number' ? taskData.taskIdCounter : 0,
      builtyIdCounter: typeof taskData.builtyIdCounter === 'number' ? taskData.builtyIdCounter : 0,
      fabricSupplier: Array.isArray(taskData.fabricSupplier) ? taskData.fabricSupplier : [],
      length: Array.isArray(taskData.length) ? taskData.length : [],
      fabricType: Array.isArray(taskData.fabricType) ? taskData.fabricType : [],
      fabricQuality: Array.isArray(taskData.fabricQuality) ? taskData.fabricQuality : [],
      dyerName: Array.isArray(taskData.dyerName) ? taskData.dyerName : [],
      sinkage: Array.isArray(taskData.sinkage) ? taskData.sinkage : [],
      styleName: Array.isArray(taskData.styleName) ? taskData.styleName : [],
      printType: Array.isArray(taskData.printType) ? taskData.printType : [],
      styleCutting: Array.isArray(taskData.styleCutting) ? taskData.styleCutting : [],
      cuttingMasterName: Array.isArray(taskData.cuttingMasterName) ? taskData.cuttingMasterName : [],
      fabricatorName: Array.isArray(taskData.fabricatorName) ? taskData.fabricatorName : [],
      receiverName: Array.isArray(taskData.receiverName) ? taskData.receiverName : [],
    };
  } catch (error) {
    console.error('[ProductionManagementDataService] Error fetching dropdown values:', error);
    throw error;
  }
}

/**
 * Creates or updates the TaskData document with the provided dropdown/counter data.
 * @param {Object} data - The data for production management dropdowns and counters.
 * @returns {Promise<Object>} The created or updated task data document.
 */
async function createTaskDataDropdown(data) {
  try {
    // Prepare sanitized data matching schema/fields
    const sanitizedData = {
      taskIdCounter: typeof data.taskIdCounter === 'number' ? data.taskIdCounter : 0,
      builtyIdCounter: typeof data.builtyIdCounter === 'number' ? data.builtyIdCounter : 0,
      fabricSupplier: ensureArray(data.fabricSupplier, 'string'),
      length: ensureArray(data.length, 'number'),
      fabricType: ensureArray(data.fabricType, 'string'),
      fabricQuality: ensureArray(data.fabricQuality, 'string'),
      dyerName: ensureArray(data.dyerName, 'string'),
      sinkage: ensureArray(data.sinkage, 'number'),
      styleName: ensureArray(data.styleName, 'string'),
      printType: ensureArray(data.printType, 'string'),
      styleCutting: ensureArray(data.styleCutting, 'string'),
      cuttingMasterName: ensureArray(data.cuttingMasterName, 'string'),
      fabricatorName: ensureArray(data.fabricatorName, 'string'),
      receiverName: ensureArray(data.receiverName, 'string'),
    };
    console.log('[ProductionManagementDataService] Creating/Updating TaskData with sanitized data:', sanitizedData);

    // Find the latest (singleton) document
    let existing = await TaskData.findOne({}, {}, { sort: { createdAt: -1 } });
    if (existing) {
      Object.assign(existing, sanitizedData);
      const saved = await existing.save();
      console.log('[ProductionManagementDataService] Updated existing TaskData:', saved._id);
      return saved;
    } else {
      const taskData = new TaskData(sanitizedData);
      const saved = await taskData.save();
      console.log('[ProductionManagementDataService] Created new TaskData:', saved._id);
      return saved;
    }
  } catch (error) {
    console.error('[ProductionManagementDataService] Error creating/updating TaskData:', error);
    throw error;
  }
}

/**
 * Updates an existing TaskData document by id.
 * @param {string} id - The id of the task data to update.
 * @param {Object} data - The updated data.
 * @returns {Promise<Object|null>} The updated document or null if not found.
 */
async function updateTaskDataDropdown(id, data) {
  try {
    const sanitizedData = {
      taskIdCounter: typeof data.taskIdCounter === 'number' ? data.taskIdCounter : 0,
      builtyIdCounter: typeof data.builtyIdCounter === 'number' ? data.builtyIdCounter : 0,
      fabricSupplier: ensureArray(data.fabricSupplier, 'string'),
      length: ensureArray(data.length, 'number'),
      fabricType: ensureArray(data.fabricType, 'string'),
      fabricQuality: ensureArray(data.fabricQuality, 'string'),
      dyerName: ensureArray(data.dyerName, 'string'),
      sinkage: ensureArray(data.sinkage, 'number'),
      styleName: ensureArray(data.styleName, 'string'),
      printType: ensureArray(data.printType, 'string'),
      styleCutting: ensureArray(data.styleCutting, 'string'),
      cuttingMasterName: ensureArray(data.cuttingMasterName, 'string'),
      fabricatorName: ensureArray(data.fabricatorName, 'string'),
      receiverName: ensureArray(data.receiverName, 'string'),
    };
    console.log(`[ProductionManagementDataService] Updating TaskData with id: ${id} sanitized data:`, sanitizedData);

    const updated = await TaskData.findByIdAndUpdate(
      id,
      { $set: sanitizedData },
      { new: true }
    );
    if (updated) {
      console.log('[ProductionManagementDataService] Updated TaskData:', updated._id);
    } else {
      console.log('[ProductionManagementDataService] No TaskData found for update with id:', id);
    }
    return updated;
  } catch (error) {
    console.error('[ProductionManagementDataService] Error updating TaskData:', error);
    throw error;
  }
}

/**
 * Deletes a TaskData document by id.
 * @param {string} id - The id of the task data to delete.
 * @returns {Promise<Object|null>} The deleted document or null if not found.
 */
async function deleteTaskDataDropdown(id) {
  try {
    console.log('[ProductionManagementDataService] Deleting TaskData with id:', id);
    const deleted = await TaskData.findByIdAndDelete(id);
    if (deleted) {
      console.log('[ProductionManagementDataService] Deleted TaskData:', deleted._id);
    } else {
      console.log('[ProductionManagementDataService] No TaskData found for deletion with id:', id);
    }
    return deleted;
  } catch (error) {
    console.error('[ProductionManagementDataService] Error deleting TaskData:', error);
    throw error;
  }
}

/**
 * Gets a TaskData document by id.
 * @param {string} id - The id of the task data.
 * @returns {Promise<Object|null>} The task data document or null if not found.
 */
async function getTaskDataDropdownById(id) {
  try {
    console.log('[ProductionManagementDataService] Fetching TaskData by id:', id);
    const doc = await TaskData.findById(id);
    if (doc) {
      console.log('[ProductionManagementDataService] Found TaskData:', doc._id);
    } else {
      console.log('[ProductionManagementDataService] No TaskData found with id:', id);
    }
    return doc;
  } catch (error) {
    console.error('[ProductionManagementDataService] Error fetching TaskData by id:', error);
    throw error;
  }
}

module.exports = {
  getTaskDataDropdownValues,
  createTaskDataDropdown,
  updateTaskDataDropdown,
  deleteTaskDataDropdown,
  getTaskDataDropdownById,
};