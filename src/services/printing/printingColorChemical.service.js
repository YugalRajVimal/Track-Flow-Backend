

const ColorChemical = require('../../models/printing/PrintingColorChemical');

/**
 * Create a new ColorChemical document.
 * NOTE: File handling (setting challanPhotoUpload path) is done in the controller
 * before this is called — the service only deals with plain data.
 */
async function addColorChemical(data) {
  const colorChemical = new ColorChemical(data);
  await colorChemical.save();
  return colorChemical;
}

/**
 * Update a ColorChemical by ID.
 */
async function editColorChemical(id, updateData) {
  return ColorChemical.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });
}

/**
 * Fetch a paginated list of ColorChemicals.
 */
async function fetchColorChemicals(filter = {}, options = {}) {
  const { skip = 0, limit = 50, sort = { createdAt: -1 } } = options;
  const query = {};

  // Text search filters for receiverName, shopName, challanNo (case-insensitive, partial match)
  if (filter.receiverName) {
    query.receiverName = { $regex: filter.receiverName, $options: 'i' };
  }
  if (filter.shopName) {
    query.shopName = { $regex: filter.shopName, $options: 'i' };
  }
  if (filter.challanNo) {
    query.challanNo = { $regex: filter.challanNo, $options: 'i' };
  }

  // Support additional filters passed (like date, etc)
  // Spread other non-empty filter keys into the main query if needed
  for (const key of Object.keys(filter)) {
    if (!['receiverName', 'shopName', 'challanNo'].includes(key) && filter[key] !== undefined && filter[key] !== '') {
      query[key] = filter[key];
    }
  }

  return ColorChemical.find(query).skip(skip).limit(limit).sort(sort);
}

/**
 * Fetch a single ColorChemical by MongoDB ID.
 */
async function fetchColorChemicalById(id) {
  return ColorChemical.findById(id);
}

/**
 * Delete a ColorChemical by ID and return the deleted document.
 */
async function deleteColorChemical(id) {
  return ColorChemical.findByIdAndDelete(id);
}

module.exports = {
  addColorChemical,
  editColorChemical,
  fetchColorChemicals,
  fetchColorChemicalById,
  deleteColorChemical,
};