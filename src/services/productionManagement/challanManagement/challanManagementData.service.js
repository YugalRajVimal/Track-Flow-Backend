const ChallanManagementData = require('../../../models/production-management/ChallanManagemenrData');

/**
 * Ensures that every array field is an array of strings (for Challan context).
 * @param {any[]} arr
 * @returns {string[]}
 */
function ensureStringArray(arr) {
  if (!Array.isArray(arr)) return [];
  // If user sends objects like { name: 'foo' } take the .name
  return arr.map(val => {
    if (typeof val === 'object' && val && 'name' in val) return String(val.name);
    return String(val);
  });
}

/**
 * Fetches the most recent challan management dropdown values.
 * @returns {Promise<Object>} An object containing arrays for each dropdown value, and counters.
 */
async function getChallanManagementDropdownValues() {
  try {
    console.log('[ChallanManagementDataService] Fetching latest Challan dropdown values');
    const challanData = await ChallanManagementData.findOne({}, {}, { sort: { createdAt: -1 } });
    if (!challanData) {
      console.log('[ChallanManagementDataService] No data found. Returning initial structure.');
      return {
        challanIdCounter: 0,
        channel: [],
        brand: [],
        courier: [],
        signUsers: [],
      };
    }
    console.log('[ChallanManagementDataService] Found ChallanManagementData:', challanData._id);
    return {
      challanIdCounter: typeof challanData.challanIdCounter === 'number' ? challanData.challanIdCounter : 0,
      channel: Array.isArray(challanData.channel) ? challanData.channel : [],
      brand: Array.isArray(challanData.brand) ? challanData.brand : [],
      courier: Array.isArray(challanData.courier) ? challanData.courier : [],
      signUsers: Array.isArray(challanData.signUsers) ? challanData.signUsers : [],
    };
  } catch (error) {
    console.error('[ChallanManagementDataService] Error fetching dropdown values:', error);
    throw error;
  }
}

/**
 * Creates or updates the ChallanManagementData document with provided data.
 * @param {Object} data
 * @returns {Promise<Object>} The created or updated document.
 */
async function createChallanManagementDropdown(data) {
  try {
    // Prepare sanitized data per schema
    const sanitizedData = {
      challanIdCounter: typeof data.challanIdCounter === 'number' ? data.challanIdCounter : 0,
      channel: ensureStringArray(data.channel),
      brand: ensureStringArray(data.brand),
      courier: ensureStringArray(data.courier),
      signUsers: ensureStringArray(data.signUsers),
    };
    console.log('[ChallanManagementDataService] Creating/Updating ChallanManagementData with sanitized data:', sanitizedData);

    // Singleton: update newest, or create
    let existing = await ChallanManagementData.findOne({}, {}, { sort: { createdAt: -1 } });
    if (existing) {
      Object.assign(existing, sanitizedData);
      const saved = await existing.save();
      console.log('[ChallanManagementDataService] Updated existing ChallanManagementData:', saved._id);
      return saved;
    } else {
      const challanData = new ChallanManagementData(sanitizedData);
      const saved = await challanData.save();
      console.log('[ChallanManagementDataService] Created new ChallanManagementData:', saved._id);
      return saved;
    }
  } catch (error) {
    console.error('[ChallanManagementDataService] Error creating/updating ChallanManagementData:', error);
    throw error;
  }
}

/**
 * Updates an existing ChallanManagementData document by id.
 * @param {string} id
 * @param {Object} data
 * @returns {Promise<Object|null>} Updated doc or null if not found.
 */
async function updateChallanManagementDropdown(id, data) {
  try {
    const sanitizedData = {
      challanIdCounter: typeof data.challanIdCounter === 'number' ? data.challanIdCounter : 0,
      channel: ensureStringArray(data.channel),
      brand: ensureStringArray(data.brand),
      courier: ensureStringArray(data.courier),
      signUsers: ensureStringArray(data.signUsers),
    };
    console.log(`[ChallanManagementDataService] Updating ChallanManagementData with id: ${id} sanitized data:`, sanitizedData);

    const updated = await ChallanManagementData.findByIdAndUpdate(
      id,
      { $set: sanitizedData },
      { new: true }
    );
    if (updated) {
      console.log('[ChallanManagementDataService] Updated ChallanManagementData:', updated._id);
    } else {
      console.log('[ChallanManagementDataService] No ChallanManagementData found for update with id:', id);
    }
    return updated;
  } catch (error) {
    console.error('[ChallanManagementDataService] Error updating ChallanManagementData:', error);
    throw error;
  }
}

/**
 * Deletes a ChallanManagementData document by id.
 * @param {string} id
 * @returns {Promise<Object|null>} The deleted document or null if not found.
 */
async function deleteChallanManagementDropdown(id) {
  try {
    console.log('[ChallanManagementDataService] Deleting ChallanManagementData with id:', id);
    const deleted = await ChallanManagementData.findByIdAndDelete(id);
    if (deleted) {
      console.log('[ChallanManagementDataService] Deleted ChallanManagementData:', deleted._id);
    } else {
      console.log('[ChallanManagementDataService] No ChallanManagementData found for deletion with id:', id);
    }
    return deleted;
  } catch (error) {
    console.error('[ChallanManagementDataService] Error deleting ChallanManagementData:', error);
    throw error;
  }
}

/**
 * Gets a ChallanManagementData document by id.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
async function getChallanManagementDropdownById(id) {
  try {
    console.log('[ChallanManagementDataService] Fetching ChallanManagementData by id:', id);
    const doc = await ChallanManagementData.findById(id);
    if (doc) {
      console.log('[ChallanManagementDataService] Found ChallanManagementData:', doc._id);
    } else {
      console.log('[ChallanManagementDataService] No ChallanManagementData found with id:', id);
    }
    return doc;
  } catch (error) {
    console.error('[ChallanManagementDataService] Error fetching ChallanManagementData by id:', error);
    throw error;
  }
}

module.exports = {
  getChallanManagementDropdownValues,
  createChallanManagementDropdown,
  updateChallanManagementDropdown,
  deleteChallanManagementDropdown,
  getChallanManagementDropdownById,
};
