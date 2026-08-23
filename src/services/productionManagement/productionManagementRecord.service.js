
// const ProductionManagementRecord = require('../../models/production-management/ProductionManagementRecord');
// const ProductionManagementData = require('../../models/production-management/ProductionMangementData');
// const StyleAverage = require('../../models/production-management/StyleAverage');
// const FabricatorRate = require('../../models/production-management/FabricatorRate');
// const User = require('../../models/User'); // adjust path if your User model lives elsewhere
 
// // ─────────────────────────────────────────────────────────────────────────
// // Helpers
// // ─────────────────────────────────────────────────────────────────────────
 
// const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
 
// const SIZE_KEYS = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
 
// /**
//  * Resolves the date to store for a given process step.
//  * If a date was supplied (from req.body), use that; otherwise fall back to
//  * the current date/time. Returns `undefined` (not a bad Date) if a supplied
//  * value can't be parsed, so callers can decide whether to fall back further.
//  */
// function resolveDate(input) {
//   if (input === undefined || input === null || input === '') return new Date();
//   const parsed = new Date(input);
//   if (Number.isNaN(parsed.getTime())) return new Date();
//   return parsed;
// }
 
// /**
//  * Atomically increments and returns the next counter value on the singleton
//  * ProductionManagementData document. `field` is 'taskIdCounter' (Ready Fabric)
//  * or 'builtyIdCounter' (Builty In).
//  */
// async function getNextCounter(field) {
//   let doc = await ProductionManagementData.findOne({}, {}, { sort: { createdAt: -1 } });
//   if (!doc) {
//     doc = await ProductionManagementData.create({ taskIdCounter: 0, builtyIdCounter: 0 });
//   }
//   doc[field] = (typeof doc[field] === 'number' ? doc[field] : 0) + 1;
//   await doc.save();
//   return doc[field];
// }
 
// /**
//  * Verifies a user's 5-digit passcode. Throws if invalid.
//  * @returns {Promise<Object>} the user document (without sensitive fields re-exposed)
//  */
// async function verifyUserPasscode(userId, passcode) {
//   if (!userId) throw new Error('userId is required for this action.');
//   if (!passcode) throw new Error('passcode is required for this action.');
 
//   const user = await User.findById(userId).select('+passcode');
//   if (!user) throw new Error('User not found.');
//   if (!user.isActive) throw new Error('User account is not active.');
 
//   const ok = await user.compareVerificationPassscode(String(passcode));
//   if (!ok) throw new Error('Invalid passcode.');
 
//   return user;
// }
 
// function sumSizes(sizes = {}) {
//   return SIZE_KEYS.reduce((sum, k) => sum + (Number(sizes[k]) || 0), 0);
// }
 
// function cleanSizesInput(sizes = {}) {
//   const out = {};
//   SIZE_KEYS.forEach((k) => { out[k] = Number(sizes?.[k]) || 0; });
//   return out;
// }
 
// function sizesAdd(a = {}, b = {}) {
//   const out = {};
//   SIZE_KEYS.forEach((k) => { out[k] = (Number(a[k]) || 0) + (Number(b[k]) || 0); });
//   return out;
// }
 
// function sizesSubtract(a = {}, b = {}) {
//   const out = {};
//   SIZE_KEYS.forEach((k) => { out[k] = Math.max(0, (Number(a[k]) || 0) - (Number(b[k]) || 0)); });
//   return out;
// }
 
// function toPlainSizes(sizeDoc) {
//   if (!sizeDoc) return {};
//   return typeof sizeDoc.toObject === 'function' ? sizeDoc.toObject() : sizeDoc;
// }
 
// /** cutting.sizes minus everything already assigned across all fabricators, size-wise. */
// function getUnassignedPool(record) {
//   const cutSizes = toPlainSizes(record.cutting?.sizes);
//   const assignedTotal = (record.fabricators || []).reduce(
//     (acc, f) => sizesAdd(acc, toPlainSizes(f.assignedSizes)),
//     {}
//   );
//   return sizesSubtract(cutSizes, assignedTotal);
// }
 
// // ─────────────────────────────────────────────────────────────────────────
// // Create
// // ─────────────────────────────────────────────────────────────────────────
 
// /**
//  * Creates a new Builty In or Ready Fabric record.
//  * @param {'BuiltyIn'|'ReadyFabric'} taskType
//  * @param {Object} data - raw form fields
//  * @param {Object} [files] - { supplierBillPhotoPath, dyerReceiverChPhotoPath, chPhotoPath }
//  */
// async function createTask(taskType, data, files = {}) {
//   if (!['BuiltyIn', 'ReadyFabric'].includes(taskType)) {
//     throw new Error("taskType must be 'BuiltyIn' or 'ReadyFabric'.");
//   }
 
//   const counterField = taskType === 'BuiltyIn' ? 'builtyIdCounter' : 'taskIdCounter';
//   const prefix = taskType === 'BuiltyIn' ? 'BLT' : 'RF';
//   const counterValue = await getNextCounter(counterField);
//   const taskId = `${prefix}-${String(counterValue).padStart(5, '0')}`;
 
//   const mtr = Number(data.mtr) || 0;
//   const length = Number(data.length) || 0;
//   const mtrL100 = round2(mtr - (mtr * (100 - length)) / 100);
 
//   // By default, ReadyFabric will not have an amount.
//   const payload = {
//     taskId,
//     taskType,
//     fabricType: data.fabricType,
//     fabricQuality: data.fabricQuality, // Added here
//     dyerName: data.dyerName,
//     length,
//     mtr,
//     mtrL100,
//     // For BuiltyIn, allow amount; for ReadyFabric, do not add it.
//     ...(taskType === 'BuiltyIn' && {
//       amount: data.amount !== undefined ? Number(data.amount) : undefined,
//     }),
//     remark: data.remark,
//     date: resolveDate(data.date),
//   };
 
//   if (taskType === 'BuiltyIn') {
//     const sinkage = Number(data.sinkage) || 0;
//     const mtrAfterSinkage = round2(mtrL100 - (mtrL100 * sinkage) / 100);
 
//     Object.assign(payload, {
//       fabricSupplier: data.fabricSupplier,
//       builtyNo: data.builtyNo,
//       rolls: data.rolls !== undefined ? Number(data.rolls) : undefined,
//       chNo: data.chNo,
//       sinkage,
//       mtrAfterSinkage,
//       supplierBillPhoto: files.supplierBillPhotoPath || undefined,
//       dyerReceiverChPhoto: files.dyerReceiverChPhotoPath || undefined,
//       verificationStatus: 'Verification Pending',
//     });
//   } else {
//     Object.assign(payload, {
//       styleName: data.styleName,
//       totalThan: data.totalThan !== undefined ? Number(data.totalThan) : undefined,
//       chNo: data.chNo,
//       chPhoto: files.chPhotoPath || undefined,
//       readyFabricStatus: 'pending',
//       receiverName: data.receiverName, // Still allow this for ReadyFabric
//       printType: data.printType, // <-- Added printType for ReadyFabric
//       // Do NOT include amount here for ReadyFabric.
//     });
//   }
 
//   const created = await ProductionManagementRecord.create(payload);
//   return created;
// }
 
// // ─────────────────────────────────────────────────────────────────────────
// // Edit / Fetch / Delete
// // ─────────────────────────────────────────────────────────────────────────
 
// async function editTask(taskId, updateData = {}, files = {}) {
//   const record = await ProductionManagementRecord.findOne({ taskId });
//   if (!record) throw new Error('Record not found.');
 
//   // Only allow amount edit for BuiltyIn, not for ReadyFabric
//   const editable = [
//     'fabricSupplier', 'builtyNo', 'rolls', 'chNo', 'length', 'fabricType', 'fabricQuality',
//     'mtr', 'dyerName', 'sinkage', 'remark', 'styleName',
//     'totalThan', 'date', 'receiverName', // receiverName now editable
//   ];
//   if (record.taskType === 'ReadyFabric') {
//     editable.push('printType'); // Allow printType to be edited for ReadyFabric
//   }
//   if (record.taskType === 'BuiltyIn') {
//     editable.push('amount');
//   }
//   editable.forEach((key) => {
//     if (updateData[key] !== undefined) record[key] = updateData[key];
//   });
 
//   // Recompute derived fields if any of their inputs changed.
//   const mtr = Number(record.mtr) || 0;
//   const length = Number(record.length) || 0;
//   record.mtrL100 = round2(mtr - (mtr * (100 - length)) / 100);
 
//   if (record.taskType === 'BuiltyIn') {
//     const sinkage = Number(record.sinkage) || 0;
//     record.mtrAfterSinkage = round2(record.mtrL100 - (record.mtrL100 * sinkage) / 100);
//     if (files.supplierBillPhotoPath) record.supplierBillPhoto = files.supplierBillPhotoPath;
//     if (files.dyerReceiverChPhotoPath) record.dyerReceiverChPhoto = files.dyerReceiverChPhotoPath;
//   } else {
//     if (files.chPhotoPath) record.chPhoto = files.chPhotoPath;
//     // Do NOT touch amount for ReadyFabric (even if present in updateData)
//     // so nothing to do here
//   }
 
//   await record.save();
//   return record;
// }
 
// async function fetchTasks(filter = {}) {
//   const {
//     taskType, verificationStatus, readyFabricStatus,
//     dateFrom, dateTo, fabricSupplier, dyerName, fabricType, fabricQuality, styleName, receiverName,
//     printType, // Allow filtering by printType
//     page = 1, pageSize = 20,
//   } = filter;
 
//   const query = {};
//   if (taskType) query.taskType = taskType;
//   if (verificationStatus) query.verificationStatus = verificationStatus;
//   if (readyFabricStatus) query.readyFabricStatus = readyFabricStatus;
//   if (fabricSupplier) query.fabricSupplier = fabricSupplier;
//   if (dyerName) query.dyerName = dyerName;
//   if (fabricType) query.fabricType = fabricType;
//   if (fabricQuality) query.fabricQuality = fabricQuality;
//   if (styleName) query.styleName = styleName;
//   if (receiverName) query.receiverName = receiverName;
//   if (printType) query.printType = printType; // Filter by printType if provided
//   if (dateFrom || dateTo) {
//     query.createdAt = {};
//     if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
//     if (dateTo) query.createdAt.$lte = new Date(dateTo);
//   }
 
//   const pageNum = Math.max(parseInt(page, 10) || 1, 1);
//   const size = Math.max(parseInt(pageSize, 10) || 20, 1);
 
//   const [data, total] = await Promise.all([
//     ProductionManagementRecord.find(query)
//       .sort({ createdAt: -1 })
//       .skip((pageNum - 1) * size)
//       .limit(size),
//     ProductionManagementRecord.countDocuments(query),
//   ]);
 
//   return { data, total, page: pageNum, pageSize: size, totalPages: Math.ceil(total / size) };
// }
 
// async function fetchByTaskId(taskId) {
//   return ProductionManagementRecord.findOne({ taskId });
// }
 
// async function deleteTask(taskId) {
//   return ProductionManagementRecord.findOneAndDelete({ taskId });
// }
 
// // ─────────────────────────────────────────────────────────────────────────
// // Builty In → Verification (passcode gated)
// // ─────────────────────────────────────────────────────────────────────────
 
// /**
//  * Second user unlocks a "Verification Pending" Builty In record with their
//  * passcode, and submits mtrShort / fabricQuality / remark. Flips status to
//  * 'Success'.
//  */
// async function verifyBuiltyIn(taskId, { userId, passcode, mtrShort, fabricQuality, remark }) {
//   const record = await ProductionManagementRecord.findOne({ taskId });
//   if (!record) throw new Error('Record not found.');
//   if (record.taskType !== 'BuiltyIn') throw new Error('Record is not a Builty In task.');
//   if (record.verificationStatus !== 'Verification Pending') {
//     throw new Error(`Record is already '${record.verificationStatus}'.`);
//   }
 
//   let user;
//   try {
//     user = await verifyUserPasscode(userId, passcode);
//   } catch (err) {
//     if (err && err.message && err.message.toLowerCase().includes('passcode')) {
//       throw new Error('Wrong passcode.');
//     }
//     throw err;
//   }
 
//   record.verification = {
//     mtrShort: mtrShort !== undefined ? Number(mtrShort) : undefined,
//     fabricQuality,
//     remark,
//     verifiedBy: user._id,
//     verifiedByName: user.name,
//     verifiedAt: new Date(),
//   };
//   record.verificationStatus = 'Success';
 
//   await record.save();
//   return record;
// }
 
// // ─────────────────────────────────────────────────────────────────────────
// // Ready Fabric → Done / Returned (passcode gated)
// // ─────────────────────────────────────────────────────────────────────────
 
// /**
//  * Second user unlocks a "pending" Ready Fabric record with their passcode
//  * and submits done/returned + jobRate + remark + mtrShort.
//  * Amount = jobRate * mtrL100.
//  */
// async function updateReadyFabricStatus(taskId, { userId, passcode, status, jobRate, remark, mtrShort }) {
//   const record = await ProductionManagementRecord.findOne({ taskId });
//   if (!record) throw new Error('Record not found.');
//   if (record.taskType !== 'ReadyFabric') throw new Error('Record is not a Ready Fabric task.');
//   if (record.readyFabricStatus !== 'pending') {
//     throw new Error(`Record is already - '${record.readyFabricStatus}'.`);
//   }
//   if (!['done', 'returned'].includes(status)) {
//     throw new Error("status must be 'done' or 'returned'.");
//   }
 
//   const user = await verifyUserPasscode(userId, passcode);
 
//   const rate = Number(jobRate) || 0;
//   const amount = round2(rate * (record.mtrL100 || 0));
//   const mtrShortVal = mtrShort !== undefined ? Number(mtrShort) : undefined;
 
//   record.completion = {
//     status,
//     jobRate: rate,
//     amount,
//     mtrShort: mtrShortVal,
//     remark,
//     completedBy: user._id,
//     completedByName: user.name,
//     completedAt: new Date(),
//   };
//   record.readyFabricStatus = status;
 
//   await record.save();
//   return record;
// }
 
// // ─────────────────────────────────────────────────────────────────────────
// // Page 2 — Cutting (Ready Fabric, status done, only)
// // ─────────────────────────────────────────────────────────────────────────
 
// async function fetchReadyFabricDoneRecords(filter = {}) {
//   return fetchTasks({ ...filter, taskType: 'ReadyFabric', readyFabricStatus: 'done' });
// }
 
// /**
//  * Returns expected pieces preview before final submit, using the admin's
//  * saved StyleAverage for (styleName, styleCutting, fabricType).
//  */
// async function previewCutting(taskId, styleCutting) {
//   const record = await ProductionManagementRecord.findOne({ taskId });
//   if (!record) throw new Error('Record not found.');
//   if (record.taskType !== 'ReadyFabric' || record.readyFabricStatus !== 'done') {
//     throw new Error('Cutting can only be started on a Ready Fabric record marked done.');
//   }
 
//   const styleAvgDoc = await StyleAverage.findOne({
//     styleName: record.styleName,
//     styleCutting,
//     fabricType: record.fabricType,
//   });
//   if (!styleAvgDoc) {
//     throw new Error('No Style Average configured for this Style Name + Style Cutting + Fabric Type combination.');
//   }
 
//   const expectedPieces = round2((record.mtrL100 || 0) / styleAvgDoc.styleAverage);
//   return { styleAverage: styleAvgDoc.styleAverage, expectedPieces, mtrL100: record.mtrL100 };
// }
 
// async function submitCutting(taskId, { userId, styleCutting, sizes, cuttingRegisterPhoto, cuttingMasterName, remark, date }) {
//   const record = await ProductionManagementRecord.findOne({ taskId });
//   if (!record) throw new Error('Record not found.');
//   if (record.taskType !== 'ReadyFabric' || record.readyFabricStatus !== 'done') {
//     throw new Error('Cutting can only be submitted on a Ready Fabric record marked done.');
//   }
 
//   const styleAvgDoc = await StyleAverage.findOne({
//     styleName: record.styleName,
//     styleCutting,
//     fabricType: record.fabricType,
//   });
//   if (!styleAvgDoc) {
//     throw new Error('No Style Average configured for this Style Name + Style Cutting + Fabric Type combination.');
//   }
 
//   const cleanSizes = cleanSizesInput(sizes);
//   const totalPieces = sumSizes(cleanSizes);
//   const mtrL100 = record.mtrL100 || 0;
//   const expectedPieces = round2(mtrL100 / styleAvgDoc.styleAverage);
//   const actualAverage = totalPieces > 0 ? round2(mtrL100 / totalPieces) : 0;
//   const fabricLoss = round2(mtrL100 - totalPieces * styleAvgDoc.styleAverage);
 
//   record.cutting = {
//     styleCutting,
//     styleAverage: styleAvgDoc.styleAverage,
//     expectedPieces,
//     sizes: cleanSizes,
//     totalPieces,
//     actualAverage,
//     fabricLoss,
//     cuttingRegisterPhoto,
//     cuttingMasterName,
//     remark,
//     submittedBy: userId || undefined,
//     submittedAt: resolveDate(date),
//   };
 
//   await record.save();
//   return record;
// }
 
// // ─────────────────────────────────────────────────────────────────────────
// // Page 3 — Fabricator / Dispatch (pieces can be split across multiple
// // fabricators; each fabricator's own due can be received back in parts)
// // ─────────────────────────────────────────────────────────────────────────
 
// /**
//  * Returns the size-wise pool of cut pieces that has NOT yet been assigned to
//  * any fabricator on this record. Used by the UI to show "remaining below"
//  * live while the user types an assignment.
//  */
// async function fetchUnassignedPool(taskId) {
//   const record = await ProductionManagementRecord.findOne({ taskId });
//   if (!record) throw new Error('Record not found.');
//   if (!record.cutting || !record.cutting.sizes) {
//     throw new Error('Cutting must be completed before the Fabricator stage can begin.');
//   }
//   return getUnassignedPool(record);
// }
 
// /**
//  * Assigns a size-wise batch of pieces to a (new, on this record) fabricator.
//  * One assignment per fabricator per record — cannot assign twice to the same
//  * fabricator; further pieces should go to a different fabricator, and any
//  * leftover just stays in the unassigned pool.
//  *
//  * Rate is auto-looked-up from FabricatorRate (styleName + styleCutting +
//  * fabricatorName) unless an explicit ratePerPiece override is passed.
//  */
// async function assignFabricator(taskId, { fabricatorName, fabricatorReceiverChPhoto, styleCutting, assignedSizes, ratePerPiece, date }) {
//   const record = await ProductionManagementRecord.findOne({ taskId });
//   if (!record) throw new Error('Record not found.');
//   if (!record.cutting || !record.cutting.sizes) {
//     throw new Error('Cutting must be completed before the Fabricator stage can begin.');
//   }
//   if (!fabricatorName) throw new Error('fabricatorName is required.');
 
//   const already = (record.fabricators || []).some((f) => f.fabricatorName === fabricatorName);
//   if (already) {
//     throw new Error(`${fabricatorName} has already been assigned pieces on this record. Submit further pieces under a different fabricator.`);
//   }
 
//   const clean = cleanSizesInput(assignedSizes);
//   const totalAssignedPieces = sumSizes(clean);
//   if (totalAssignedPieces <= 0) {
//     throw new Error('At least one size must have pieces greater than zero to assign.');
//   }
 
//   const pool = getUnassignedPool(record);
//   const overSize = SIZE_KEYS.find((k) => clean[k] > pool[k]);
//   if (overSize) {
//     throw new Error(`Cannot assign ${clean[overSize]} pcs for size ${overSize}; only ${pool[overSize]} pcs remain unassigned.`);
//   }
 
//   const effectiveStyleCutting = styleCutting || record.cutting.styleCutting;
 
//   let rate = Number(ratePerPiece);
//   if (!rate) {
//     const rateDoc = await FabricatorRate.findOne({
//       styleName: record.styleName,
//       styleCutting: effectiveStyleCutting,
//       fabricatorName,
//     });
//     rate = rateDoc ? rateDoc.rate : 0;
//   }
 
//   record.fabricators = record.fabricators || [];
//   record.fabricators.push({
//     fabricatorName,
//     fabricatorReceiverChPhoto,
//     styleCutting: effectiveStyleCutting,
//     assignedSizes: clean,
//     totalAssignedPieces,
//     ratePerPiece: rate,
//     duePieces: clean,
//     totalDuePieces: totalAssignedPieces,
//     receivings: [],
//     status: 'pending',
//     assignedAt: resolveDate(date),
//   });
 
//   await record.save();
//   return record;
// }
 
// /**
//  * Records a (possibly partial) receiving of pieces back FROM one specific
//  * fabricator assignment (identified by its subdocument _id). Passcode gated.
//  * Cannot receive more than that fabricator's own remaining due, per size.
//  */
// async function addFabricatorReceiving(taskId, fabricatorId, { userId, passcode, receivedSizes, receiverName, receivingEntryPhoto, date }) {
//   const record = await ProductionManagementRecord.findOne({ taskId });
//   if (!record) throw new Error('Record not found.');
 
//   const fab = (record.fabricators || []).id(fabricatorId);
//   if (!fab) throw new Error('Fabricator assignment not found on this record.');
//   if (fab.status === 'completed') throw new Error('All pieces have already been received from this fabricator.');
 
//   const user = await verifyUserPasscode(userId, passcode);
 
//   const clean = cleanSizesInput(receivedSizes);
//   const totalReceivedPieces = sumSizes(clean);
//   if (totalReceivedPieces <= 0) {
//     throw new Error('At least one size must have pieces greater than zero to receive.');
//   }
 
//   const currentDue = toPlainSizes(fab.duePieces);
//   const overSize = SIZE_KEYS.find((k) => clean[k] > (currentDue[k] || 0));
//   if (overSize) {
//     throw new Error(`Cannot receive ${clean[overSize]} pcs for size ${overSize}; only ${currentDue[overSize] || 0} pcs are due from this fabricator.`);
//   }
 
//   const newDue = sizesSubtract(currentDue, clean);
//   const rate = Number(fab.ratePerPiece) || 0;
//   const totalAmount = round2(totalReceivedPieces * rate);
 
//   fab.receivings.push({
//     receivedSizes: clean,
//     totalReceivedPieces,
//     ratePerPiece: rate,
//     totalAmount,
//     receivingEntryPhoto,
//     receiverName,
//     dueAfterEntry: newDue,
//     receivedBy: user._id,
//     receivedByName: user.name,
//     receivedAt: resolveDate(date),
//   });
 
//   fab.duePieces = newDue;
//   fab.totalDuePieces = sumSizes(newDue);
//   fab.status = fab.totalDuePieces > 0 ? 'partially-received' : 'completed';
 
//   await record.save();
//   return record;
// }
 
// module.exports = {
//   createTask,
//   editTask,
//   fetchTasks,
//   fetchByTaskId,
//   deleteTask,
//   verifyBuiltyIn,
//   updateReadyFabricStatus,
//   fetchReadyFabricDoneRecords,
//   previewCutting,
//   submitCutting,
//   fetchUnassignedPool,
//   assignFabricator,
//   addFabricatorReceiving,
// };
 
const ProductionManagementRecord = require('../../models/production-management/ProductionManagementRecord');
const ProductionManagementData = require('../../models/production-management/ProductionMangementData');
const StyleAverage = require('../../models/production-management/StyleAverage');
const FabricatorRate = require('../../models/production-management/FabricatorRate');
const User = require('../../models/User'); // adjust path if your User model lives elsewhere
 
// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────
 
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
 
const SIZE_KEYS = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
 
/**
 * Resolves the date to store for a given process step.
 * If a date was supplied (from req.body), use that; otherwise fall back to
 * the current date/time. Returns `undefined` (not a bad Date) if a supplied
 * value can't be parsed, so callers can decide whether to fall back further.
 */
function resolveDate(input) {
  if (input === undefined || input === null || input === '') return new Date();
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return new Date();
  return parsed;
}
 
/**
 * Atomically increments and returns the next counter value on the singleton
 * ProductionManagementData document. `field` is 'taskIdCounter' (Ready Fabric)
 * or 'builtyIdCounter' (Builty In).
 */
async function getNextCounter(field) {
  let doc = await ProductionManagementData.findOne({}, {}, { sort: { createdAt: -1 } });
  if (!doc) {
    doc = await ProductionManagementData.create({ taskIdCounter: 0, builtyIdCounter: 0 });
  }
  doc[field] = (typeof doc[field] === 'number' ? doc[field] : 0) + 1;
  await doc.save();
  return doc[field];
}
 
/**
 * Verifies a user's 5-digit passcode. Throws if invalid.
 * @returns {Promise<Object>} the user document (without sensitive fields re-exposed)
 */
async function verifyUserPasscode(userId, passcode) {
  if (!userId) throw new Error('userId is required for this action.');
  if (!passcode) throw new Error('passcode is required for this action.');
 
  const user = await User.findById(userId).select('+verificationPassscode');
  if (!user) throw new Error('User not found.');
  if (!user.isActive) throw new Error('User account is not active.');
 
  const ok = await user.compareVerificationPassscode(String(passcode));
  if (!ok) throw new Error('Invalid passcode.');
 
  return user;
}
 
function sumSizes(sizes = {}) {
  return SIZE_KEYS.reduce((sum, k) => sum + (Number(sizes[k]) || 0), 0);
}
 
function cleanSizesInput(sizes = {}) {
  const out = {};
  SIZE_KEYS.forEach((k) => { out[k] = Number(sizes?.[k]) || 0; });
  return out;
}
 
function sizesAdd(a = {}, b = {}) {
  const out = {};
  SIZE_KEYS.forEach((k) => { out[k] = (Number(a[k]) || 0) + (Number(b[k]) || 0); });
  return out;
}
 
function sizesSubtract(a = {}, b = {}) {
  const out = {};
  SIZE_KEYS.forEach((k) => { out[k] = Math.max(0, (Number(a[k]) || 0) - (Number(b[k]) || 0)); });
  return out;
}
 
function toPlainSizes(sizeDoc) {
  if (!sizeDoc) return {};
  return typeof sizeDoc.toObject === 'function' ? sizeDoc.toObject() : sizeDoc;
}
 
/** cutting.sizes minus everything already assigned across all fabricators, size-wise. */
function getUnassignedPool(record) {
  const cutSizes = toPlainSizes(record.cutting?.sizes);
  const assignedTotal = (record.fabricators || []).reduce(
    (acc, f) => sizesAdd(acc, toPlainSizes(f.assignedSizes)),
    {}
  );
  return sizesSubtract(cutSizes, assignedTotal);
}
 
// ─────────────────────────────────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────────────────────────────────
 
/**
 * Creates a new Builty In or Ready Fabric record.
 * @param {'BuiltyIn'|'ReadyFabric'} taskType
 * @param {Object} data - raw form fields
 * @param {Object} [files] - { supplierBillPhotoPath, dyerReceiverChPhotoPath, chPhotoPath }
 */
async function createTask(taskType, data, files = {}) {
  if (!['BuiltyIn', 'ReadyFabric'].includes(taskType)) {
    throw new Error("taskType must be 'BuiltyIn' or 'ReadyFabric'.");
  }
 
  const counterField = taskType === 'BuiltyIn' ? 'builtyIdCounter' : 'taskIdCounter';
  const prefix = taskType === 'BuiltyIn' ? 'BLT' : 'RF';
  const counterValue = await getNextCounter(counterField);
  const taskId = `${prefix}-${String(counterValue).padStart(5, '0')}`;
 
  const mtr = Number(data.mtr) || 0;
  const length = Number(data.length) || 0;
  const mtrL100 = round2(mtr - (mtr * (100 - length)) / 100);
 
  // By default, ReadyFabric will not have an amount.
  const payload = {
    taskId,
    taskType,
    fabricType: data.fabricType,
    fabricQuality: data.fabricQuality, // Added here
    dyerName: data.dyerName,
    length,
    mtr,
    mtrL100,
    // For BuiltyIn, allow amount; for ReadyFabric, do not add it.
    ...(taskType === 'BuiltyIn' && {
      amount: data.amount !== undefined ? Number(data.amount) : undefined,
    }),
    remark: data.remark,
    date: resolveDate(data.date),
  };
 
  if (taskType === 'BuiltyIn') {
    const sinkage = Number(data.sinkage) || 0;
    const mtrAfterSinkage = round2(mtrL100 - (mtrL100 * sinkage) / 100);
 
    Object.assign(payload, {
      fabricSupplier: data.fabricSupplier,
      builtyNo: data.builtyNo,
      rolls: data.rolls !== undefined ? Number(data.rolls) : undefined,
      chNo: data.chNo,
      sinkage,
      mtrAfterSinkage,
      supplierBillPhoto: files.supplierBillPhotoPath || undefined,
      dyerReceiverChPhoto: files.dyerReceiverChPhotoPath || undefined,
      verificationStatus: 'Verification Pending',
    });
  } else {
    Object.assign(payload, {
      styleName: data.styleName,
      totalThan: data.totalThan !== undefined ? Number(data.totalThan) : undefined,
      chNo: data.chNo,
      chPhoto: files.chPhotoPath || undefined,
      readyFabricStatus: 'pending',
      receiverName: data.receiverName, // Still allow this for ReadyFabric
      printType: data.printType, // <-- Added printType for ReadyFabric
      // Do NOT include amount here for ReadyFabric.
    });
  }
 
  const created = await ProductionManagementRecord.create(payload);
  return created;
}
 
// ─────────────────────────────────────────────────────────────────────────
// Edit / Fetch / Delete
// ─────────────────────────────────────────────────────────────────────────
 
async function editTask(taskId, updateData = {}, files = {}) {
  const record = await ProductionManagementRecord.findOne({ taskId });
  if (!record) throw new Error('Record not found.');
 
  // Only allow amount edit for BuiltyIn, not for ReadyFabric
  const editable = [
    'fabricSupplier', 'builtyNo', 'rolls', 'chNo', 'length', 'fabricType', 'fabricQuality',
    'mtr', 'dyerName', 'sinkage', 'remark', 'styleName',
    'totalThan', 'date', 'receiverName', // receiverName now editable
  ];
  if (record.taskType === 'ReadyFabric') {
    editable.push('printType'); // Allow printType to be edited for ReadyFabric
  }
  if (record.taskType === 'BuiltyIn') {
    editable.push('amount');
  }
  editable.forEach((key) => {
    if (updateData[key] !== undefined) record[key] = updateData[key];
  });
 
  // Recompute derived fields if any of their inputs changed.
  const mtr = Number(record.mtr) || 0;
  const length = Number(record.length) || 0;
  record.mtrL100 = round2(mtr - (mtr * (100 - length)) / 100);
 
  if (record.taskType === 'BuiltyIn') {
    const sinkage = Number(record.sinkage) || 0;
    record.mtrAfterSinkage = round2(record.mtrL100 - (record.mtrL100 * sinkage) / 100);
    if (files.supplierBillPhotoPath) record.supplierBillPhoto = files.supplierBillPhotoPath;
    if (files.dyerReceiverChPhotoPath) record.dyerReceiverChPhoto = files.dyerReceiverChPhotoPath;
  } else {
    if (files.chPhotoPath) record.chPhoto = files.chPhotoPath;
    // Do NOT touch amount for ReadyFabric (even if present in updateData)
    // so nothing to do here
  }
 
  await record.save();
  return record;
}
 
async function fetchTasks(filter = {}) {
  const {
    taskType, verificationStatus, readyFabricStatus,
    dateFrom, dateTo, fabricSupplier, dyerName, fabricType, fabricQuality, styleName, receiverName,
    printType, // Allow filtering by printType
    page = 1, pageSize = 20,
  } = filter;
 
  const query = {};
  if (taskType) query.taskType = taskType;
  if (verificationStatus) query.verificationStatus = verificationStatus;
  if (readyFabricStatus) query.readyFabricStatus = readyFabricStatus;
  if (fabricSupplier) query.fabricSupplier = fabricSupplier;
  if (dyerName) query.dyerName = dyerName;
  if (fabricType) query.fabricType = fabricType;
  if (fabricQuality) query.fabricQuality = fabricQuality;
  if (styleName) query.styleName = styleName;
  if (receiverName) query.receiverName = receiverName;
  if (printType) query.printType = printType; // Filter by printType if provided
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) query.createdAt.$lte = new Date(dateTo);
  }
 
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const size = Math.max(parseInt(pageSize, 10) || 20, 1);
 
  const [data, total] = await Promise.all([
    ProductionManagementRecord.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * size)
      .limit(size),
    ProductionManagementRecord.countDocuments(query),
  ]);
 
  return { data, total, page: pageNum, pageSize: size, totalPages: Math.ceil(total / size) };
}
 
async function fetchByTaskId(taskId) {
  return ProductionManagementRecord.findOne({ taskId });
}

// ─────────────────────────────────────────────────────────────────────────
// Pending Verifications — aggregated view across all three stages
// ─────────────────────────────────────────────────────────────────────────

/**
 * Aggregates everything across the pipeline that is waiting on a second
 * person's action, grouped by which page it needs to be actioned on:
 *   - builtyIn:   BuiltyIn tasks with verificationStatus 'Verification Pending'
 *                 → actioned on the Task Creation page.
 *   - readyFabric: ReadyFabric tasks with readyFabricStatus 'pending'
 *                 → actioned on the Task Creation page.
 *   - cutting:    ReadyFabric tasks marked 'done' but cutting not yet
 *                 submitted → actioned on the Started Trackings page.
 *   - fabricator: individual fabricator assignments (on any record) that
 *                 are 'pending' or 'partially-received' (pieces still due)
 *                 → actioned on the Submission Management page.
 */
async function fetchPendingVerifications() {
  const [builtyInPending, readyFabricPending, doneReadyFabric, fabricatorRecords] = await Promise.all([
    ProductionManagementRecord.find({ taskType: 'BuiltyIn', verificationStatus: 'Verification Pending' })
      .sort({ createdAt: -1 }),
    ProductionManagementRecord.find({ taskType: 'ReadyFabric', readyFabricStatus: 'pending' })
      .sort({ createdAt: -1 }),
    ProductionManagementRecord.find({ taskType: 'ReadyFabric', readyFabricStatus: 'done' })
      .sort({ createdAt: -1 }),
    ProductionManagementRecord.find({
      taskType: 'ReadyFabric',
      'fabricators.status': { $in: ['pending', 'partially-received'] },
    }).sort({ createdAt: -1 }),
  ]);

  const builtyIn = builtyInPending.map((r) => ({
    taskId: r.taskId,
    fabricSupplier: r.fabricSupplier,
    builtyNo: r.builtyNo,
    mtrL100: r.mtrL100,
    createdAt: r.createdAt,
  }));

  const readyFabric = readyFabricPending.map((r) => ({
    taskId: r.taskId,
    styleName: r.styleName,
    fabricType: r.fabricType,
    mtrL100: r.mtrL100,
    createdAt: r.createdAt,
  }));

  const cutting = doneReadyFabric
    .filter((r) => !r.cutting || !r.cutting.totalPieces)
    .map((r) => ({
      taskId: r.taskId,
      styleName: r.styleName,
      fabricType: r.fabricType,
      mtrL100: r.mtrL100,
      createdAt: r.createdAt,
    }));

  const fabricator = [];
  fabricatorRecords.forEach((r) => {
    (r.fabricators || []).forEach((f) => {
      if (f.status === 'pending' || f.status === 'partially-received') {
        fabricator.push({
          taskId: r.taskId,
          fabricatorId: f._id,
          fabricatorName: f.fabricatorName,
          styleName: r.styleName,
          styleCutting: f.styleCutting,
          totalAssignedPieces: f.totalAssignedPieces,
          totalDuePieces: f.totalDuePieces,
          status: f.status,
          assignedAt: f.assignedAt,
        });
      }
    });
  });

  const total = builtyIn.length + readyFabric.length + cutting.length + fabricator.length;

  return { builtyIn, readyFabric, cutting, fabricator, total };
}
 
async function deleteTask(taskId) {
  return ProductionManagementRecord.findOneAndDelete({ taskId });
}
 
// ─────────────────────────────────────────────────────────────────────────
// Builty In → Verification (passcode gated)
// ─────────────────────────────────────────────────────────────────────────
 
/**
 * Second user unlocks a "Verification Pending" Builty In record with their
 * passcode, and submits mtrShort / fabricQuality / remark. Flips status to
 * 'Success'.
 */
async function verifyBuiltyIn(taskId, { userId, passcode, mtrShort, fabricQuality, remark }) {
  const record = await ProductionManagementRecord.findOne({ taskId });
  if (!record) throw new Error('Record not found.');
  if (record.taskType !== 'BuiltyIn') throw new Error('Record is not a Builty In task.');
  if (record.verificationStatus !== 'Verification Pending') {
    throw new Error(`Record is already '${record.verificationStatus}'.`);
  }
 
  let user;
  try {
    user = await verifyUserPasscode(userId, passcode);
  } catch (err) {
    if (err && err.message && err.message.toLowerCase().includes('passcode')) {
      throw new Error('Wrong passcode.');
    }
    throw err;
  }
 
  record.verification = {
    mtrShort: mtrShort !== undefined ? Number(mtrShort) : undefined,
    fabricQuality,
    remark,
    verifiedBy: user._id,
    verifiedByName: user.name,
    verifiedAt: new Date(),
  };
  record.verificationStatus = 'Success';
 
  await record.save();
  return record;
}
 
// ─────────────────────────────────────────────────────────────────────────
// Ready Fabric → Done / Returned (passcode gated)
// ─────────────────────────────────────────────────────────────────────────
 
/**
 * Second user unlocks a "pending" Ready Fabric record with their passcode
 * and submits done/returned + jobRate + remark + mtrShort.
 * Amount = jobRate * mtrL100.
 */
async function updateReadyFabricStatus(taskId, { userId, passcode, status, jobRate, remark, mtrShort }) {
  const record = await ProductionManagementRecord.findOne({ taskId });
  if (!record) throw new Error('Record not found.');
  if (record.taskType !== 'ReadyFabric') throw new Error('Record is not a Ready Fabric task.');
  if (record.readyFabricStatus !== 'pending') {
    throw new Error(`Record is already - '${record.readyFabricStatus}'.`);
  }
  if (!['done', 'returned'].includes(status)) {
    throw new Error("status must be 'done' or 'returned'.");
  }
 
  const user = await verifyUserPasscode(userId, passcode);
 
  const rate = Number(jobRate) || 0;
  const amount = round2(rate * (record.mtrL100 || 0));
  const mtrShortVal = mtrShort !== undefined ? Number(mtrShort) : undefined;
 
  record.completion = {
    status,
    jobRate: rate,
    amount,
    mtrShort: mtrShortVal,
    remark,
    completedBy: user._id,
    completedByName: user.name,
    completedAt: new Date(),
  };
  record.readyFabricStatus = status;
 
  await record.save();
  return record;
}
 
// ─────────────────────────────────────────────────────────────────────────
// Page 2 — Cutting (Ready Fabric, status done, only)
// ─────────────────────────────────────────────────────────────────────────
 
async function fetchReadyFabricDoneRecords(filter = {}) {
  return fetchTasks({ ...filter, taskType: 'ReadyFabric', readyFabricStatus: 'done' });
}
 
/**
 * Returns expected pieces preview before final submit, using the admin's
 * saved StyleAverage for (styleName, styleCutting, fabricType).
 */
async function previewCutting(taskId, styleCutting) {
  const record = await ProductionManagementRecord.findOne({ taskId });
  if (!record) throw new Error('Record not found.');
  if (record.taskType !== 'ReadyFabric' || record.readyFabricStatus !== 'done') {
    throw new Error('Cutting can only be started on a Ready Fabric record marked done.');
  }
 
  const styleAvgDoc = await StyleAverage.findOne({
    styleName: record.styleName,
    styleCutting,
    fabricType: record.fabricType,
  });
  if (!styleAvgDoc) {
    throw new Error('No Style Average configured for this Style Name + Style Cutting + Fabric Type combination.');
  }
 
  const expectedPieces = round2((record.mtrL100 || 0) / styleAvgDoc.styleAverage);
  return { styleAverage: styleAvgDoc.styleAverage, expectedPieces, mtrL100: record.mtrL100 };
}
 
async function submitCutting(taskId, { userId, styleCutting, sizes, cuttingRegisterPhoto, cuttingMasterName, remark, date }) {
  const record = await ProductionManagementRecord.findOne({ taskId });
  if (!record) throw new Error('Record not found.');
  if (record.taskType !== 'ReadyFabric' || record.readyFabricStatus !== 'done') {
    throw new Error('Cutting can only be submitted on a Ready Fabric record marked done.');
  }
 
  const styleAvgDoc = await StyleAverage.findOne({
    styleName: record.styleName,
    styleCutting,
    fabricType: record.fabricType,
  });
  if (!styleAvgDoc) {
    throw new Error('No Style Average configured for this Style Name + Style Cutting + Fabric Type combination.');
  }
 
  const cleanSizes = cleanSizesInput(sizes);
  const totalPieces = sumSizes(cleanSizes);
  const mtrL100 = record.mtrL100 || 0;
  const expectedPieces = round2(mtrL100 / styleAvgDoc.styleAverage);
  const actualAverage = totalPieces > 0 ? round2(mtrL100 / totalPieces) : 0;
  const fabricLoss = round2(mtrL100 - totalPieces * styleAvgDoc.styleAverage);
 
  record.cutting = {
    styleCutting,
    styleAverage: styleAvgDoc.styleAverage,
    expectedPieces,
    sizes: cleanSizes,
    totalPieces,
    actualAverage,
    fabricLoss,
    cuttingRegisterPhoto,
    cuttingMasterName,
    remark,
    submittedBy: userId || undefined,
    submittedAt: resolveDate(date),
  };
 
  await record.save();
  return record;
}
 
// ─────────────────────────────────────────────────────────────────────────
// Page 3 — Fabricator / Dispatch (pieces can be split across multiple
// fabricators; each fabricator's own due can be received back in parts)
// ─────────────────────────────────────────────────────────────────────────
 
/**
 * Returns the size-wise pool of cut pieces that has NOT yet been assigned to
 * any fabricator on this record. Used by the UI to show "remaining below"
 * live while the user types an assignment.
 */
async function fetchUnassignedPool(taskId) {
  const record = await ProductionManagementRecord.findOne({ taskId });
  if (!record) throw new Error('Record not found.');
  if (!record.cutting || !record.cutting.sizes) {
    throw new Error('Cutting must be completed before the Fabricator stage can begin.');
  }
  return getUnassignedPool(record);
}
 
/**
 * Assigns a size-wise batch of pieces to a (new, on this record) fabricator.
 * One assignment per fabricator per record — cannot assign twice to the same
 * fabricator; further pieces should go to a different fabricator, and any
 * leftover just stays in the unassigned pool.
 *
 * Rate is auto-looked-up from FabricatorRate (styleName + styleCutting +
 * fabricatorName) unless an explicit ratePerPiece override is passed.
 */
async function assignFabricator(taskId, { fabricatorName, fabricatorReceiverChPhoto, styleCutting, assignedSizes, ratePerPiece, date }) {
  const record = await ProductionManagementRecord.findOne({ taskId });
  if (!record) throw new Error('Record not found.');
  if (!record.cutting || !record.cutting.sizes) {
    throw new Error('Cutting must be completed before the Fabricator stage can begin.');
  }
  if (!fabricatorName) throw new Error('fabricatorName is required.');
 
  const already = (record.fabricators || []).some((f) => f.fabricatorName === fabricatorName);
  if (already) {
    throw new Error(`${fabricatorName} has already been assigned pieces on this record. Submit further pieces under a different fabricator.`);
  }
 
  const clean = cleanSizesInput(assignedSizes);
  const totalAssignedPieces = sumSizes(clean);
  if (totalAssignedPieces <= 0) {
    throw new Error('At least one size must have pieces greater than zero to assign.');
  }
 
  const pool = getUnassignedPool(record);
  const overSize = SIZE_KEYS.find((k) => clean[k] > pool[k]);
  if (overSize) {
    throw new Error(`Cannot assign ${clean[overSize]} pcs for size ${overSize}; only ${pool[overSize]} pcs remain unassigned.`);
  }
 
  const effectiveStyleCutting = styleCutting || record.cutting.styleCutting;
 
  let rate = Number(ratePerPiece);
  if (!rate) {
    const rateDoc = await FabricatorRate.findOne({
      styleName: record.styleName,
      styleCutting: effectiveStyleCutting,
      fabricatorName,
    });
    rate = rateDoc ? rateDoc.rate : 0;
  }
 
  record.fabricators = record.fabricators || [];
  record.fabricators.push({
    fabricatorName,
    fabricatorReceiverChPhoto,
    styleCutting: effectiveStyleCutting,
    assignedSizes: clean,
    totalAssignedPieces,
    ratePerPiece: rate,
    duePieces: clean,
    totalDuePieces: totalAssignedPieces,
    receivings: [],
    status: 'pending',
    assignedAt: resolveDate(date),
  });
 
  await record.save();
  return record;
}
 
/**
 * Records a (possibly partial) receiving of pieces back FROM one specific
 * fabricator assignment (identified by its subdocument _id). Passcode gated.
 * Cannot receive more than that fabricator's own remaining due, per size.
 */
async function addFabricatorReceiving(taskId, fabricatorId, { userId, passcode, receivedSizes, receiverName, receivingEntryPhoto, date }) {
  const record = await ProductionManagementRecord.findOne({ taskId });
  if (!record) throw new Error('Record not found.');
 
  const fab = (record.fabricators || []).id(fabricatorId);
  if (!fab) throw new Error('Fabricator assignment not found on this record.');
  if (fab.status === 'completed') throw new Error('All pieces have already been received from this fabricator.');
 
  const user = await verifyUserPasscode(userId, passcode);
 
  const clean = cleanSizesInput(receivedSizes);
  const totalReceivedPieces = sumSizes(clean);
  if (totalReceivedPieces <= 0) {
    throw new Error('At least one size must have pieces greater than zero to receive.');
  }
 
  const currentDue = toPlainSizes(fab.duePieces);
  const overSize = SIZE_KEYS.find((k) => clean[k] > (currentDue[k] || 0));
  if (overSize) {
    throw new Error(`Cannot receive ${clean[overSize]} pcs for size ${overSize}; only ${currentDue[overSize] || 0} pcs are due from this fabricator.`);
  }
 
  const newDue = sizesSubtract(currentDue, clean);
  const rate = Number(fab.ratePerPiece) || 0;
  const totalAmount = round2(totalReceivedPieces * rate);
 
  fab.receivings.push({
    receivedSizes: clean,
    totalReceivedPieces,
    ratePerPiece: rate,
    totalAmount,
    receivingEntryPhoto,
    receiverName,
    dueAfterEntry: newDue,
    receivedBy: user._id,
    receivedByName: user.name,
    receivedAt: resolveDate(date),
  });
 
  fab.duePieces = newDue;
  fab.totalDuePieces = sumSizes(newDue);
  fab.status = fab.totalDuePieces > 0 ? 'partially-received' : 'completed';
 
  await record.save();
  return record;
}
 
// ─────────────────────────────────────────────────────────────────────────
// Dashboard stats — grand totals + size-wise pipeline breakdown, filterable
// ─────────────────────────────────────────────────────────────────────────

/**
 * Aggregates Production Management figures for the common dashboard.
 *
 * Filters (all optional, combined with AND):
 *   styleName     — exact match on ReadyFabric styleName
 *   styleCutting  — exact match on cutting.styleCutting OR any fabricator's
 *                   styleCutting snapshot (a record can have cutting done
 *                   under one style-cutting value even before any fabricator
 *                   is assigned, so both are checked)
 *   fabricType    — exact match (applies to both BuiltyIn and ReadyFabric MTR
 *                   totals, and narrows the style-wise/pipeline sections)
 *   printType     — exact match, ReadyFabric only ("printer-wise")
 *   dateFrom/dateTo — inclusive range on createdAt
 *
 * Everything is computed in JS after a single filtered fetch (mirrors the
 * size-math already used elsewhere in this service) rather than a Mongo
 * aggregation pipeline, since a single production run's record count is
 * small enough that this stays fast and easy to follow/extend.
 */
async function fetchDashboardStats(filters = {}) {
  const { styleName, styleCutting, fabricType, printType, dateFrom, dateTo } = filters;

  const baseQuery = {};
  if (fabricType) baseQuery.fabricType = fabricType;
  if (dateFrom || dateTo) {
    baseQuery.createdAt = {};
    if (dateFrom) baseQuery.createdAt.$gte = new Date(dateFrom);
    if (dateTo) baseQuery.createdAt.$lte = new Date(dateTo);
  }

  const records = await ProductionManagementRecord.find(baseQuery);

  const matchesStyleCutting = (r) => {
    if (!styleCutting) return true;
    if (r.cutting?.styleCutting === styleCutting) return true;
    return (r.fabricators || []).some((f) => f.styleCutting === styleCutting);
  };
  const matchesStyleName = (r) => !styleName || r.styleName === styleName;
  const matchesPrintType = (r) => !printType || r.printType === printType;

  const builtyIn = records.filter((r) => r.taskType === 'BuiltyIn');
  const readyFabric = records.filter(
    (r) => r.taskType === 'ReadyFabric' && matchesStyleName(r) && matchesPrintType(r) && matchesStyleCutting(r)
  );

  // ── Totals ────────────────────────────────────────────────────────────
  const totalMtrBiltyIn = builtyIn.reduce((sum, r) => sum + (Number(r.mtrL100) || 0), 0);
  const totalReadyFabricIn = readyFabric.reduce((sum, r) => sum + (Number(r.mtrL100) || 0), 0);

  // Fabric loss: only positive values are summed (negative = actual came out
  // ahead of expected, which isn't a "loss" for this total).
  const totalFabricLoss = readyFabric.reduce((sum, r) => {
    const loss = Number(r.cutting?.fabricLoss);
    return sum + (Number.isFinite(loss) && loss > 0 ? loss : 0);
  }, 0);

  // ── Size-wise pipeline breakdown ─────────────────────────────────────
  const zeroSizes = () => SIZE_KEYS.reduce((acc, k) => ({ ...acc, [k]: 0 }), {});
  const pendingAtCutting = zeroSizes(); // cut but not yet assigned to any fabricator
  const pendingAtFabricators = zeroSizes(); // assigned, still due back
  const submittedPieces = zeroSizes(); // actually received back from fabricators

  let unassignedRecordCount = 0;
  let assignmentPendingCount = 0;
  let assignmentPartialCount = 0;
  let assignmentCompletedCount = 0;

  readyFabric.forEach((r) => {
    if (r.cutting?.sizes) {
      const pool = getUnassignedPool(r);
      SIZE_KEYS.forEach((k) => { pendingAtCutting[k] += Number(pool[k]) || 0; });
      if (sumSizes(pool) > 0) unassignedRecordCount += 1;
    }

    (r.fabricators || []).forEach((f) => {
      if (styleCutting && f.styleCutting !== styleCutting && r.cutting?.styleCutting !== styleCutting) return;

      const due = toPlainSizes(f.duePieces);
      SIZE_KEYS.forEach((k) => { pendingAtFabricators[k] += Number(due[k]) || 0; });

      (f.receivings || []).forEach((rec) => {
        const received = toPlainSizes(rec.receivedSizes);
        SIZE_KEYS.forEach((k) => { submittedPieces[k] += Number(received[k]) || 0; });
      });

      if (f.status === 'pending') assignmentPendingCount += 1;
      else if (f.status === 'partially-received') assignmentPartialCount += 1;
      else if (f.status === 'completed') assignmentCompletedCount += 1;
    });
  });

  // ── Style / cutting / fabric-type / average grouping ─────────────────
  // One row per distinct (styleName, styleCutting, fabricType, styleAverage)
  // combination seen in cutting-submitted records, with the same size-wise
  // breakdown rolled up per group.
  const groupMap = new Map();
  readyFabric.forEach((r) => {
    if (!r.cutting?.styleCutting) return;
    const key = [r.styleName || '', r.cutting.styleCutting || '', r.fabricType || '', r.cutting.styleAverage ?? ''].join('|');
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        styleName: r.styleName || '',
        styleCutting: r.cutting.styleCutting || '',
        fabricType: r.fabricType || '',
        styleAverage: r.cutting.styleAverage ?? null,
        totalCutPieces: 0,
        pendingAtCutting: zeroSizes(),
        pendingAtFabricators: zeroSizes(),
        submittedPieces: zeroSizes(),
        fabricLoss: 0,
        recordCount: 0,
      });
    }
    const g = groupMap.get(key);
    g.recordCount += 1;
    g.totalCutPieces += Number(r.cutting.totalPieces) || 0;
    const loss = Number(r.cutting.fabricLoss);
    if (Number.isFinite(loss) && loss > 0) g.fabricLoss += loss;

    const pool = getUnassignedPool(r);
    SIZE_KEYS.forEach((k) => { g.pendingAtCutting[k] += Number(pool[k]) || 0; });

    (r.fabricators || []).forEach((f) => {
      const due = toPlainSizes(f.duePieces);
      SIZE_KEYS.forEach((k) => { g.pendingAtFabricators[k] += Number(due[k]) || 0; });
      (f.receivings || []).forEach((rec) => {
        const received = toPlainSizes(rec.receivedSizes);
        SIZE_KEYS.forEach((k) => { g.submittedPieces[k] += Number(received[k]) || 0; });
      });
    });
  });

  return {
    filtersApplied: { styleName, styleCutting, fabricType, printType, dateFrom, dateTo },
    totals: {
      totalMtrBiltyIn,
      totalReadyFabricIn,
      totalFabricLoss,
      builtyInCount: builtyIn.length,
      readyFabricCount: readyFabric.length,
    },
    sizeWise: {
      pendingAtCutting,
      pendingAtFabricators,
      submittedPieces,
      totals: {
        pendingAtCutting: sumSizes(pendingAtCutting),
        pendingAtFabricators: sumSizes(pendingAtFabricators),
        submittedPieces: sumSizes(submittedPieces),
      },
    },
    fabricatorAssignmentStatus: {
      pending: assignmentPendingCount,
      partiallyReceived: assignmentPartialCount,
      completed: assignmentCompletedCount,
      unassignedRecords: unassignedRecordCount,
    },
    styleBreakdown: Array.from(groupMap.values()).map((g) => ({
      ...g,
      totalPendingAtCutting: sumSizes(g.pendingAtCutting),
      totalPendingAtFabricators: sumSizes(g.pendingAtFabricators),
      totalSubmittedPieces: sumSizes(g.submittedPieces),
    })).sort((a, b) => a.styleName.localeCompare(b.styleName) || a.styleCutting.localeCompare(b.styleCutting)),
  };
}

module.exports = {
  createTask,
  editTask,
  fetchTasks,
  fetchByTaskId,
  fetchPendingVerifications,
  fetchDashboardStats,
  deleteTask,
  verifyBuiltyIn,
  updateReadyFabricStatus,
  fetchReadyFabricDoneRecords,
  previewCutting,
  submitCutting,
  fetchUnassignedPool,
  assignFabricator,
  addFabricatorReceiving,
};