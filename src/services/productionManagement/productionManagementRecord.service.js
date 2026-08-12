// const ProductionManagementRecord = require('../../models/production-management/ProductionManagementRecord');
// const ProductionManagementData = require('../../models/production-management/ProductionMangementData');
// const StyleAverage = require('../../models/production-management/StyleAverage');
// const User = require('../../models/User'); // adjust path if your User model lives elsewhere

// // ─────────────────────────────────────────────────────────────────────────
// // Helpers
// // ─────────────────────────────────────────────────────────────────────────

// const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

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

//   const ok = await user.comparePasscode(String(passcode));
//   if (!ok) throw new Error('Invalid passcode.');

//   return user;
// }

// function sumSizes(sizes = {}) {
//   const keys = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
//   return keys.reduce((sum, k) => sum + (Number(sizes[k]) || 0), 0);
// }

// function subtractSizes(totalSizes = {}, receivedTotalPieces, previouslyReceived = 0) {
//   // Distributes remaining due proportionally is over-engineering; instead we
//   // expect the caller (frontend) to send explicit duePieces per size for each
//   // receiving entry, since only the handler on the ground knows which sizes
//   // were short. We just store what's sent. See addFabricatorReceiving.
//   return totalSizes;
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
//     date: data.date || null,
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
//   console.log('verifyBuiltyIn called with:', { taskId, userId, mtrShort, fabricQuality, remark });

//   const record = await ProductionManagementRecord.findOne({ taskId });
//   console.log('Fetched record:', record);

//   if (!record) {
//     console.error('Record not found for taskId:', taskId);
//     throw new Error('Record not found.');
//   }
//   if (record.taskType !== 'BuiltyIn') {
//     console.error('Wrong task type:', record.taskType);
//     throw new Error('Record is not a Builty In task.');
//   }
//   if (record.verificationStatus !== 'Verification Pending') {
//     console.error(`Record is already '${record.verificationStatus}'.`);
//     throw new Error(`Record is already '${record.verificationStatus}'.`);
//   }

//   let user;
//   try {
//     user = await verifyUserPasscode(userId, passcode);
//     console.log('User passcode verified:', user && user._id);
//   } catch (err) {
//     if (err && err.message && err.message.toLowerCase().includes('passcode')) {
//       console.error('Wrong passcode for user:', userId);
//       throw new Error('Wrong passcode.');
//     }
//     console.error('Error in verifyUserPasscode:', err);
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
//   console.log('Record after verification:', record);

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
//     throw new Error(`Record is already '${record.readyFabricStatus}'.`);
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

// async function submitCutting(taskId, { userId, styleCutting, sizes, cuttingRegisterPhoto, cuttingMasterName, remark }) {
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

//   const cleanSizes = {
//     S: Number(sizes?.S) || 0,
//     M: Number(sizes?.M) || 0,
//     L: Number(sizes?.L) || 0,
//     XL: Number(sizes?.XL) || 0,
//     XXL: Number(sizes?.XXL) || 0,
//     XXXL: Number(sizes?.XXXL) || 0,
//   };
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
//     submittedAt: new Date(),
//   };

//   await record.save();
//   return record;
// }

// // ─────────────────────────────────────────────────────────────────────────
// // Page 3 — Fabricator / Dispatch
// // ─────────────────────────────────────────────────────────────────────────

// /**
//  * Initiates the fabricator/dispatch stage for a record that has completed
//  * cutting. Snapshots the size-wise totals from the cutting stage.
//  */
// async function initFabricator(taskId, { fabricatorName, fabricatorReceiverChPhoto }) {
//   const record = await ProductionManagementRecord.findOne({ taskId });
//   if (!record) throw new Error('Record not found.');
//   if (!record.cutting || !record.cutting.sizes) {
//     throw new Error('Cutting must be completed before the Fabricator stage can begin.');
//   }

//   record.fabricator = {
//     fabricatorName,
//     fabricatorReceiverChPhoto,
//     totalPiecesSizeWise: { ...record.cutting.sizes.toObject() },
//     receivings: record.fabricator?.receivings || [],
//     status: 'pending',
//   };

//   await record.save();
//   return record;
// }

// /**
//  * Verification step: a user (passcode gated) records a partial or final
//  * receiving of pieces from the fabricator. Can be called multiple times
//  * until all pieces are received (fabricator.status becomes 'completed').
//  */
// async function addFabricatorReceiving(taskId, {
//   userId, passcode, totalReceivedPieces, ratePerPiece,
//   receivingEntryPhoto, receiverName, duePieces,
// }) {
//   const record = await ProductionManagementRecord.findOne({ taskId });
//   if (!record) throw new Error('Record not found.');
//   if (!record.fabricator) throw new Error('Fabricator stage has not been started for this record.');
//   if (record.fabricator.status === 'completed') throw new Error('All pieces have already been received.');

//   const user = await verifyUserPasscode(userId, passcode);

//   const received = Number(totalReceivedPieces) || 0;
//   const rate = Number(ratePerPiece) || 0;
//   const totalAmount = round2(received * rate);

//   record.fabricator.receivings.push({
//     totalReceivedPieces: received,
//     ratePerPiece: rate,
//     totalAmount,
//     receivingEntryPhoto,
//     receiverName,
//     duePieces: {
//       S: Number(duePieces?.S) || 0,
//       M: Number(duePieces?.M) || 0,
//       L: Number(duePieces?.L) || 0,
//       XL: Number(duePieces?.XL) || 0,
//       XXL: Number(duePieces?.XXL) || 0,
//       XXXL: Number(duePieces?.XXXL) || 0,
//     },
//     receivedBy: user._id,
//     receivedByName: user.name,
//     receivedAt: new Date(),
//   });

//   // Fully received once the most recent entry reports zero due across all sizes.
//   const latestDue = record.fabricator.receivings[record.fabricator.receivings.length - 1].duePieces;
//   const stillDue = sumSizes(latestDue);
//   record.fabricator.status = stillDue > 0 ? 'partially-received' : 'completed';

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
//   initFabricator,
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

  const user = await User.findById(userId).select('+passcode');
  if (!user) throw new Error('User not found.');
  if (!user.isActive) throw new Error('User account is not active.');

  const ok = await user.comparePasscode(String(passcode));
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
    date: data.date || null,
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

async function submitCutting(taskId, { userId, styleCutting, sizes, cuttingRegisterPhoto, cuttingMasterName, remark }) {
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
    submittedAt: new Date(),
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
async function assignFabricator(taskId, { fabricatorName, fabricatorReceiverChPhoto, styleCutting, assignedSizes, ratePerPiece }) {
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
    assignedAt: new Date(),
  });

  await record.save();
  return record;
}

/**
 * Records a (possibly partial) receiving of pieces back FROM one specific
 * fabricator assignment (identified by its subdocument _id). Passcode gated.
 * Cannot receive more than that fabricator's own remaining due, per size.
 */
async function addFabricatorReceiving(taskId, fabricatorId, { userId, passcode, receivedSizes, receiverName, receivingEntryPhoto }) {
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
    receivedAt: new Date(),
  });

  fab.duePieces = newDue;
  fab.totalDuePieces = sumSizes(newDue);
  fab.status = fab.totalDuePieces > 0 ? 'partially-received' : 'completed';

  await record.save();
  return record;
}

module.exports = {
  createTask,
  editTask,
  fetchTasks,
  fetchByTaskId,
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
