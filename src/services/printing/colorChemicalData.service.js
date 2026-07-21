const ColorChemicalDropdown = require('../../models/printing/PrintingColorChemicalData');

// Fetch the single dropdown document holding arrays of receiverName and shopName
async function getColorChemicalDropdown() {
  try {
    // Assumes only one document should exist
    let doc = await ColorChemicalDropdown.findOne({});
    if (!doc) {
      // Create a new doc if none exists
      doc = await ColorChemicalDropdown.create({
        receiverName: [],
        shopName: [],
      });
    }
    return doc;
  } catch (error) {
    throw new Error(`Error fetching color chemical dropdowns: ${error.message}`);
  }
}

// Add receiverName(s) and/or shopName(s) to the arrays in the single document
async function addToColorChemicalDropdown({ receiverNames = [], shopNames = [] }) {
  try {
    // Find the one document or create if not exists
    let doc = await ColorChemicalDropdown.findOne({});
    if (!doc) {
      doc = new ColorChemicalDropdown({
        receiverName: receiverNames,
        shopName: shopNames,
      });
    } else {
      // Add items to arrays, avoiding duplicates
      if (receiverNames.length > 0) {
        receiverNames.forEach((name) => {
          if (!doc.receiverName.includes(name)) {
            doc.receiverName.push(name);
          }
        });
      }
      if (shopNames.length > 0) {
        shopNames.forEach((name) => {
          if (!doc.shopName.includes(name)) {
            doc.shopName.push(name);
          }
        });
      }
    }
    return await doc.save();
  } catch (error) {
    throw new Error(`Error adding to color chemical dropdown: ${error.message}`);
  }
}

// Edit receiverName or shopName arrays explicitly (replace with new arrays)
async function editColorChemicalDropdownArrays({ receiverNames, shopNames }) {
  try {
    let doc = await ColorChemicalDropdown.findOne({});
    if (!doc) {
      throw new Error('Dropdown entry not found');
    }

    if (Array.isArray(receiverNames)) {
      doc.receiverName = receiverNames;
    }
    if (Array.isArray(shopNames)) {
      doc.shopName = shopNames;
    }
    return await doc.save();
  } catch (error) {
    throw new Error(`Error updating color chemical dropdown: ${error.message}`);
  }
}

// Remove a receiverName or shopName from the arrays
async function removeFromColorChemicalDropdown({ receiverNames = [], shopNames = [] }) {
  try {
    let doc = await ColorChemicalDropdown.findOne({});
    if (!doc) {
      throw new Error('Dropdown entry not found');
    }
    if (receiverNames.length > 0) {
      doc.receiverName = doc.receiverName.filter(
        (name) => !receiverNames.includes(name)
      );
    }
    if (shopNames.length > 0) {
      doc.shopName = doc.shopName.filter(
        (name) => !shopNames.includes(name)
      );
    }
    return await doc.save();
  } catch (error) {
    throw new Error(`Error removing from color chemical dropdown: ${error.message}`);
  }
}

// Optionally, allow deleting the entire dropdown document (rarely needed)
async function deleteColorChemicalDropdown() {
  try {
    const deleted = await ColorChemicalDropdown.findOneAndDelete({});
    if (!deleted) {
      throw new Error('Dropdown entry not found');
    }
    return deleted;
  } catch (error) {
    throw new Error(`Error deleting color chemical dropdown: ${error.message}`);
  }
}

module.exports = {
  getColorChemicalDropdown,
  addToColorChemicalDropdown,
  editColorChemicalDropdownArrays,
  removeFromColorChemicalDropdown,
  deleteColorChemicalDropdown,
};