const OfflineDropdown = require('../models/OfflineData');

/**
 * Fetches all offline dropdown values (styleTypes, salesMen, partyNames).
 * @returns {Promise<Object>} An object containing arrays of the dropdown values.
 */
async function getOfflineDropdownValues() {
  const dropdownData = await OfflineDropdown.findOne({}, {}, { sort: { createdAt: -1 } });
  if (!dropdownData) {
    return {
      styleTypes: [],
      salesMen: [],
      partyNames: []
    };
  }
  return {
    styleTypes: dropdownData.styleTypes.map(item => item.name),
    salesMen: dropdownData.salesMen.map(item => item.name),
    partyNames: dropdownData.partyNames.map(item => item.name),
  };
}

/**
 * Creates a new OfflineDropdown document.
 * @param {Object} data - The data for the new dropdown.
 * @param {Array<{name: string}>} data.styleTypes
 * @param {Array<{name: string}>} data.salesMen
 * @param {Array<{name: string}>} data.partyNames
 * @returns {Promise<Object>} The created dropdown document.
 */
async function createOfflineDropdown(data) {
  const dropdown = new OfflineDropdown({
    styleTypes: data.styleTypes || [],
    salesMen: data.salesMen || [],
    partyNames: data.partyNames || []
  });
  return await dropdown.save();
}

/**
 * Updates an existing OfflineDropdown document by id.
 * @param {string} id - The id of the dropdown to update.
 * @param {Object} data - The updated data.
 * @returns {Promise<Object|null>} The updated document or null if not found.
 */
async function updateOfflineDropdown(id, data) {
  const updated = await OfflineDropdown.findByIdAndUpdate(
    id,
    {
      $set: {
        styleTypes: data.styleTypes,
        salesMen: data.salesMen,
        partyNames: data.partyNames
      }
    },
    { new: true }
  );
  return updated;
}

/**
 * Deletes an OfflineDropdown document by id.
 * @param {string} id - The id of the dropdown to delete.
 * @returns {Promise<Object|null>} The deleted document or null if not found.
 */
async function deleteOfflineDropdown(id) {
  return await OfflineDropdown.findByIdAndDelete(id);
}

/**
 * Gets an OfflineDropdown document by id.
 * @param {string} id - The id of the dropdown.
 * @returns {Promise<Object|null>} The dropdown document or null if not found.
 */
async function getOfflineDropdownById(id) {
  return await OfflineDropdown.findById(id);
}

module.exports = {
  getOfflineDropdownValues,
  createOfflineDropdown,
  updateOfflineDropdown,
  deleteOfflineDropdown,
  getOfflineDropdownById,
};