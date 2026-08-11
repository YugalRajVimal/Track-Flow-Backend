const CostManagement = require('../../models/production-management/CostManagement');
const StyleAverage = require('../../models/production-management/StyleAverage');
const ProductionManagementData = require('../../models/production-management/ProductionMangementData');

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

async function getNextCounter() {
  let doc = await ProductionManagementData.findOne({}, {}, { sort: { createdAt: -1 } });
  if (!doc) {
    doc = await ProductionManagementData.create({ taskIdCounter: 0, builtyIdCounter: 0, costManagementCounter: 0 });
  }
  doc.costManagementCounter = (typeof doc.costManagementCounter === 'number' ? doc.costManagementCounter : 0) + 1;
  await doc.save();
  return doc.costManagementCounter;
}

/**
 * StyleAverage is keyed by styleName + styleCutting + fabricType, but Cost
 * Management only has styleName + fabricType (no styleCutting yet at this
 * stage). We average across every styleCutting variant on file for that
 * styleName + fabricType combination.
 */
async function lookupStyleAverage(styleName, fabricType) {
  const matches = await StyleAverage.find({ styleName, fabricType });
  if (!matches.length) return null;
  const avg = matches.reduce((sum, m) => sum + m.styleAverage, 0) / matches.length;
  return round2(avg);
}

function sumLines(lines = []) {
  return lines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
}

function computeFinalCosting(record) {
  return round2(
    (Number(record.readyFabricRate) || 0) +
    (Number(record.cutting) || 0) +
    (Number(record.stitching) || 0) +
    sumLines(record.finishing) +
    sumLines(record.packingMaterial) +
    sumLines(record.other)
  );
}

function cleanLines(lines) {
  if (!Array.isArray(lines)) return [];
  return lines
    .filter((l) => l && l.label)
    .map((l) => ({ label: String(l.label).trim(), amount: Number(l.amount) || 0 }));
}

async function createCostManagement(data) {
  const { styleName, fabricType, printType, readyFabricRate } = data;
  if (!styleName || !fabricType || !printType || readyFabricRate === undefined) {
    throw new Error('styleName, fabricType, printType and readyFabricRate are all required.');
  }

  const counterValue = await getNextCounter();
  const recordId = `CM-${String(counterValue).padStart(5, '0')}`;

  const styleAverage = await lookupStyleAverage(styleName, fabricType);

  const payload = {
    recordId,
    styleName: String(styleName).trim(),
    fabricType: String(fabricType).trim(),
    printType: String(printType).trim(),
    readyFabricRate: Number(readyFabricRate),
    styleAverage,
    cutting: Number(data.cutting) || 0,
    stitching: Number(data.stitching) || 0,
    finishing: cleanLines(data.finishing),
    packingMaterial: cleanLines(data.packingMaterial),
    other: cleanLines(data.other),
    remark: data.remark,
  };
  payload.finalCosting = computeFinalCosting(payload);

  return CostManagement.create(payload);
}

async function editCostManagement(recordId, data = {}) {
  const record = await CostManagement.findOne({ recordId });
  if (!record) throw new Error('Record not found.');

  const scalarFields = ['styleName', 'fabricType', 'printType', 'readyFabricRate', 'cutting', 'stitching', 'remark'];
  scalarFields.forEach((key) => {
    if (data[key] !== undefined) record[key] = data[key];
  });
  if (data.finishing !== undefined) record.finishing = cleanLines(data.finishing);
  if (data.packingMaterial !== undefined) record.packingMaterial = cleanLines(data.packingMaterial);
  if (data.other !== undefined) record.other = cleanLines(data.other);

  // Re-derive style average whenever styleName/fabricType changed.
  if (data.styleName !== undefined || data.fabricType !== undefined) {
    record.styleAverage = await lookupStyleAverage(record.styleName, record.fabricType);
  }

  record.finalCosting = computeFinalCosting(record);

  await record.save();
  return record;
}

async function fetchCostManagements(filter = {}) {
  const { 
    styleName, 
    fabricType, 
    printType, 
    page = 1, 
    pageSize = 20,
    fromDate,   // Expecting ISO string or yyyy-mm-dd
    toDate      // Expecting ISO string or yyyy-mm-dd
  } = filter;
  const query = {};
  if (styleName) query.styleName = styleName;
  if (fabricType) query.fabricType = fabricType;
  if (printType) query.printType = printType;

  // Add date filter if provided
  if (fromDate || toDate) {
    query.createdAt = {};
    if (fromDate) {
      query.createdAt.$gte = new Date(fromDate);
    }
    if (toDate) {
      // Add one day if format is yyyy-mm-dd
      // To support up-to end of day for toDate (exclusive), add 1 day and use $lt
      const toDateObj = new Date(toDate);
      toDateObj.setDate(toDateObj.getDate() + 1);
      query.createdAt.$lt = toDateObj;
    }
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const size = Math.max(parseInt(pageSize, 10) || 20, 1);

  const [data, total] = await Promise.all([
    CostManagement.find(query).sort({ createdAt: -1 }).skip((pageNum - 1) * size).limit(size),
    CostManagement.countDocuments(query),
  ]);

  return { data, total, page: pageNum, pageSize: size, totalPages: Math.ceil(total / size) };
}

async function fetchCostManagementById(recordId) {
  return CostManagement.findOne({ recordId });
}

async function deleteCostManagement(recordId) {
  return CostManagement.findOneAndDelete({ recordId });
}

/** Used by the frontend to preview Style Average before final submit. */
async function previewStyleAverage(styleName, fabricType) {
  const styleAverage = await lookupStyleAverage(styleName, fabricType);
  return { styleAverage };
}

module.exports = {
  createCostManagement,
  editCostManagement,
  fetchCostManagements,
  fetchCostManagementById,
  deleteCostManagement,
  previewStyleAverage,
};
