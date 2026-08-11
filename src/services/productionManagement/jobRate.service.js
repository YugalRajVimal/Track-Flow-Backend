const JobRate = require('../../models/production-management/JobRate');

async function createJobRate(data) {
  const { printType, fabricType, dyerName, rate } = data;
  if (!printType || !fabricType || !dyerName || rate === undefined) {
    throw new Error('printType, fabricType, dyerName, and rate are all required.');
  }
  return JobRate.create({
    printType: String(printType).trim(),
    fabricType: String(fabricType).trim(),
    dyerName: String(dyerName).trim(),
    rate: Number(rate),
  });
}

async function updateJobRate(id, data) {
  const update = {};
  ['printType', 'fabricType', 'dyerName'].forEach((k) => {
    if (data[k] !== undefined) update[k] = String(data[k]).trim();
  });
  if (data.rate !== undefined) update.rate = Number(data.rate);

  return JobRate.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
}

async function deleteJobRate(id) {
  return JobRate.findByIdAndDelete(id);
}

async function fetchJobRates(filter = {}) {
  const { printType, fabricType, dyerName } = filter;
  const query = {};
  if (printType) query.printType = printType;
  if (fabricType) query.fabricType = fabricType;
  if (dyerName) query.dyerName = dyerName;
  return JobRate.find(query).sort({ printType: 1, fabricType: 1, dyerName: 1 });
}

async function fetchJobRateById(id) {
  return JobRate.findById(id);
}

/** Lookup a job rate for a specific combination of fields. */
async function lookupJobRate({ printType, fabricType, dyerName }) {
  return JobRate.findOne({ printType, fabricType, dyerName });
}

module.exports = {
  createJobRate,
  updateJobRate,
  deleteJobRate,
  fetchJobRates,
  fetchJobRateById,
  lookupJobRate,
};
