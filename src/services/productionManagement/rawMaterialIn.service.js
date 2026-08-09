const RawMaterialIn = require('../../models/production-management/RawMaterialIn');
const ProductionManagementData = require('../../models/production-management/ProductionMangementData');

/**
 * Atomically increments and returns the next rawMaterialInCounter on the
 * singleton ProductionManagementData document (reuses the same doc as the
 * other production-management counters).
 */
async function getNextCounter() {
  let doc = await ProductionManagementData.findOne({}, {}, { sort: { createdAt: -1 } });
  if (!doc) {
    doc = await ProductionManagementData.create({ taskIdCounter: 0, builtyIdCounter: 0, rawMaterialInCounter: 0 });
  }
  doc.rawMaterialInCounter = (typeof doc.rawMaterialInCounter === 'number' ? doc.rawMaterialInCounter : 0) + 1;
  await doc.save();
  return doc.rawMaterialInCounter;
}

async function createRawMaterialIn(data, files = {}) {
  const { supplierName, items, amount, paymentMode, receiverName, remark, date } = data;
  if (!supplierName || !items || amount === undefined || !paymentMode || !receiverName) {
    throw new Error('supplierName, items, amount, paymentMode and receiverName are all required.');
  }
  if (!['Cash', 'UPI', 'Due'].includes(paymentMode)) {
    throw new Error("paymentMode must be one of 'Cash', 'UPI', 'Due'.");
  }

  const counterValue = await getNextCounter();
  const recordId = `RMI-${String(counterValue).padStart(5, '0')}`;

  return RawMaterialIn.create({
    recordId,
    supplierName: String(supplierName).trim(),
    items: String(items).trim(),
    amount: Number(amount),
    paymentMode,
    receiverName: String(receiverName).trim(),
    chPhoto: files.chPhotoPath || undefined,
    remark,
    date: date || null,
  });
}

async function editRawMaterialIn(recordId, data = {}, files = {}) {
  const record = await RawMaterialIn.findOne({ recordId });
  if (!record) throw new Error('Record not found.');

  const editable = ['supplierName', 'items', 'amount', 'paymentMode', 'receiverName', 'remark', 'date'];
  editable.forEach((key) => {
    if (data[key] !== undefined) record[key] = data[key];
  });
  if (files.chPhotoPath) record.chPhoto = files.chPhotoPath;

  await record.save();
  return record;
}

async function fetchRawMaterialIns(filter = {}) {
  const { supplierName, receiverName, paymentMode, dateFrom, dateTo, page = 1, pageSize = 20 } = filter;
  const query = {};
  if (supplierName) query.supplierName = supplierName;
  if (receiverName) query.receiverName = receiverName;
  if (paymentMode) query.paymentMode = paymentMode;
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) query.createdAt.$lte = new Date(dateTo);
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const size = Math.max(parseInt(pageSize, 10) || 20, 1);

  const [data, total] = await Promise.all([
    RawMaterialIn.find(query).sort({ createdAt: -1 }).skip((pageNum - 1) * size).limit(size),
    RawMaterialIn.countDocuments(query),
  ]);

  return { data, total, page: pageNum, pageSize: size, totalPages: Math.ceil(total / size) };
}

async function fetchRawMaterialInById(recordId) {
  return RawMaterialIn.findOne({ recordId });
}

async function deleteRawMaterialIn(recordId) {
  return RawMaterialIn.findOneAndDelete({ recordId });
}

module.exports = {
  createRawMaterialIn,
  editRawMaterialIn,
  fetchRawMaterialIns,
  fetchRawMaterialInById,
  deleteRawMaterialIn,
};
