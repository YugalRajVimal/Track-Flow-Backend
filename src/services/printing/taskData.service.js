const TaskData = require('../../models/printing/PrintingTaskData');

/**
 * Helper function to ensure array fields contain only strings.
 * @param {any[]} arr
 * @returns {string[]}
 */
function ensureStringArray(arr) {
  if (!Array.isArray(arr)) {
    return [];
  }
  return arr.map(val => {
    if (typeof val === 'object' && val !== null && 'name' in val) {
      return String(val.name);
    }
    return String(val);
  });
}

/**
 * Fetches the most recent task data dropdown values.
 * @returns {Promise<Object>} An object containing arrays for each dropdown value.
 */
async function getTaskDataDropdownValues() {
  try {
    console.log('[TaskDataService] Fetching latest task data dropdown values');
    const taskData = await TaskData.findOne({}, {}, { sort: { createdAt: -1 } });
    if (!taskData) {
      console.log('[TaskDataService] No TaskData found. Returning empty arrays.');
      return {
        partyName: [],
        transportName: [],
        fabricType: [],
        length: [],
        sinkage: [],
        recieverName: [],
        programName: [],
        FabricPartyName: [],
        recieverPartyName: [],
        jigars: [],
        submitterName: [],
      };
    }
    console.log('[TaskDataService] Found TaskData:', taskData._id);
    return {
      partyName: Array.isArray(taskData.partyName) ? taskData.partyName : [],
      transportName: Array.isArray(taskData.transportName) ? taskData.transportName : [],
      fabricType: Array.isArray(taskData.fabricType) ? taskData.fabricType : [],
      length: Array.isArray(taskData.length) ? taskData.length : [],
      sinkage: Array.isArray(taskData.sinkage) ? taskData.sinkage : [],
      recieverName: Array.isArray(taskData.recieverName) ? taskData.recieverName : [],
      programName: Array.isArray(taskData.programName) ? taskData.programName : [],
      FabricPartyName: Array.isArray(taskData.FabricPartyName) ? taskData.FabricPartyName : [],
      recieverPartyName: Array.isArray(taskData.recieverPartyName) ? taskData.recieverPartyName : [],
      jigars: Array.isArray(taskData.jigars) ? taskData.jigars : [],
      submitterName: Array.isArray(taskData.submitterName) ? taskData.submitterName : [],
    };
  } catch (error) {
    console.error('[TaskDataService] Error fetching dropdown values:', error);
    throw error;
  }
}

/**
 * Creates a new TaskData document if none exists, otherwise updates the existing document.
 * @param {Object} data - The data for the task data dropdowns.
 * @returns {Promise<Object>} The created or updated task data document.
 */
async function createTaskDataDropdown(data) {
  try {
    // Sanitize, for debug clarity only
    const sanitizedData = {
      partyName: ensureStringArray(data.partyName),
      transportName: ensureStringArray(data.transportName),
      fabricType: ensureStringArray(data.fabricType),
      length: ensureStringArray(data.length),
      sinkage: ensureStringArray(data.sinkage),
      recieverName: ensureStringArray(data.recieverName),
      programName: ensureStringArray(data.programName),
      FabricPartyName: ensureStringArray(data.FabricPartyName),
      recieverPartyName: ensureStringArray(data.recieverPartyName),
      jigars: ensureStringArray(data.jigars),
      submitterName: ensureStringArray(data.submitterName),
    };
    console.log('[TaskDataService] Creating/Updating TaskData with sanitized data:', sanitizedData);

    // Check for existing TaskData (latest by createdAt desc)
    let existing = await TaskData.findOne({}, {}, { sort: { createdAt: -1 } });
    if (existing) {
      // Update the existing document instead of creating a new one
      Object.assign(existing, sanitizedData);
      const saved = await existing.save();
      console.log('[TaskDataService] Updated existing TaskData:', saved._id);
      return saved;
    } else {
      // If not found, create a new entry
      const taskData = new TaskData(sanitizedData);
      const saved = await taskData.save();
      console.log('[TaskDataService] Created new TaskData:', saved._id);
      return saved;
    }
  } catch (error) {
    console.error('[TaskDataService] Error creating/updating TaskData:', error);
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
      partyName: ensureStringArray(data.partyName),
      transportName: ensureStringArray(data.transportName),
      fabricType: ensureStringArray(data.fabricType),
      length: ensureStringArray(data.length),
      sinkage: ensureStringArray(data.sinkage),
      recieverName: ensureStringArray(data.recieverName),
      programName: ensureStringArray(data.programName),
      FabricPartyName: ensureStringArray(data.FabricPartyName),
      recieverPartyName: ensureStringArray(data.recieverPartyName),
      jigars: ensureStringArray(data.jigars),
      submitterName: ensureStringArray(data.submitterName),
    };
    console.log(`[TaskDataService] Updating TaskData with id: ${id} sanitized data:`, sanitizedData);

    const updated = await TaskData.findByIdAndUpdate(
      id,
      { $set: sanitizedData },
      { new: true }
    );
    if (updated) {
      console.log('[TaskDataService] Updated TaskData:', updated._id);
    } else {
      console.log('[TaskDataService] No TaskData found for update with id:', id);
    }
    return updated;
  } catch (error) {
    console.error('[TaskDataService] Error updating TaskData:', error);
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
    console.log('[TaskDataService] Deleting TaskData with id:', id);
    const deleted = await TaskData.findByIdAndDelete(id);
    if (deleted) {
      console.log('[TaskDataService] Deleted TaskData:', deleted._id);
    } else {
      console.log('[TaskDataService] No TaskData found for deletion with id:', id);
    }
    return deleted;
  } catch (error) {
    console.error('[TaskDataService] Error deleting TaskData:', error);
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
    console.log('[TaskDataService] Fetching TaskData by id:', id);
    const doc = await TaskData.findById(id);
    if (doc) {
      console.log('[TaskDataService] Found TaskData:', doc._id);
    } else {
      console.log('[TaskDataService] No TaskData found with id:', id);
    }
    return doc;
  } catch (error) {
    console.error('[TaskDataService] Error fetching TaskData by id:', error);
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