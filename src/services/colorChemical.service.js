// const ColorChemical = require('../models/ColorChemical');

// // Create (Add) a new ColorChemical
// const fs = require('fs');
// const path = require('path');

// async function addColorChemical(data) {
//   let fileToDelete = null;
//   try {
//     // If file upload info present on data, handle file path
//     if (data && data._file) {
//       let fileName = data._file.filename;
//       if (!fileName && data._file.originalname) {
//         fileName = data._file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
//       }
//       if (fileName) {
//         data.photoPath = `/uploads/${fileName}`;
//         fileToDelete = path.join(__dirname, '..', 'uploads', fileName);
//       }
//       delete data._file; // remove from input
//     }

//     const colorChemical = new ColorChemical(data);
//     await colorChemical.save();
//     return colorChemical;
//   } catch (error) {
//     if (fileToDelete && fs.existsSync(fileToDelete)) {
//       try { fs.unlinkSync(fileToDelete); } catch {/* ignore */ }
//     }
//     throw error;
//   }
// }

// // Edit (Update) a ColorChemical by ID
// async function editColorChemical(id, updateData) {
//   let fileToDelete = null;
//   try {
//     // If file upload info present on updateData, handle file path
//     if (updateData && updateData._file) {
//       let fileName = updateData._file.filename;
//       if (!fileName && updateData._file.originalname) {
//         fileName = updateData._file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
//       }
//       if (fileName) {
//         updateData.photoPath = `/uploads/${fileName}`;
//         fileToDelete = path.join(__dirname, '..', 'uploads', fileName);
//       }
//       delete updateData._file;
//     }

//     const updated = await ColorChemical.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
//     return updated;
//   } catch (error) {
//     if (fileToDelete && fs.existsSync(fileToDelete)) {
//       try { fs.unlinkSync(fileToDelete); } catch {/* ignore */ }
//     }
//     throw error;
//   }
// }

// // Fetch (Get) ColorChemicals
// async function fetchColorChemicals(filter = {}, options = {}) {
//   try {
//     // Basic filter and pagination support
//     const { skip = 0, limit = 50, sort = { createdAt: -1 } } = options;
//     const colorChemicals = await ColorChemical.find(filter)
//       .skip(skip)
//       .limit(limit)
//       .sort(sort);
//     return colorChemicals;
//   } catch (error) {
//     throw error;
//   }
// }

// // Fetch (Get) single ColorChemical by ID
// async function fetchColorChemicalById(id) {
//   try {
//     return await ColorChemical.findById(id);
//   } catch (error) {
//     throw error;
//   }
// }

// // Delete a ColorChemical by ID
// async function deleteColorChemical(id) {
//   try {
//     return await ColorChemical.findByIdAndDelete(id);
//   } catch (error) {
//     throw error;
//   }
// }

// module.exports = {
//   addColorChemical,
//   editColorChemical,
//   fetchColorChemicals,
//   fetchColorChemicalById,
//   deleteColorChemical,
// };

const ColorChemical = require('../models/ColorChemical');

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
  return ColorChemical.find(filter).skip(skip).limit(limit).sort(sort);
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