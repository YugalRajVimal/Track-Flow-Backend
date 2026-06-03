const { Parser } = require('json2csv');
const awbService = require('../services/awb.service');
const ReturnRecord = require('../models/ReturnRecord');
const returnService = require('../services/return.service');
const { sendError } = require('../utils/response');
const { Parser: CSVParser } = require('json2csv');


const exportAWBCSV = async (req, res, next) => {
  try {
    const records = await awbService.getAWBsForExport(req.query);

    const data = records.map((r) => ({
      'AWB ID': r.awbId,
      Status: r.status,
      'Channel Partner': r.channelPartner?.name || '',
      'Channel Partner Code': r.channelPartner?.code || '',
      Brand: r.brand?.name || '',
      'Brand Code': r.brand?.code || '',
      'Scanned At': r.scannedAt ? new Date(r.scannedAt).toISOString() : '',
      'Cancelled At': r.cancelledAt ? new Date(r.cancelledAt).toISOString() : '',
      'Created By': r.createdBy?.name || '',
      'Created By Email': r.createdBy?.email || '',
      'Created At': r.createdAt ? new Date(r.createdAt).toISOString() : '',
    }));

    const fields = [
      'AWB ID',
      'Status',
      'Channel Partner',
      'Channel Partner Code',
      'Brand',
      'Brand Code',
      'Scanned At',
      'Cancelled At',
      'Created By',
      'Created By Email',
      'Created At',
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(data);

    const filename = `awb-export-${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

// Use correct name and service for getting ReturnRecords and exporting as CSV.
// Import the ReturnRecord model.


/**
 * Exports ReturnRecord data as CSV.
 * Pass filters as query params (same keys as used in list APIs).
 */
const exportReturnCSV = async (req, res, next) => {
  try {
    // Use the service for consistent filter/query handling
    const records = await returnService.getAWBsForExport(req.query);

    // Format rows for export, show "Returned" if status is "-"
    const data = records.map((r) => ({
      'AWB ID': r.awbId,
      'Status': r.status === '-' ? 'returned' : r.status,
      'Channel Partner': r.channelPartner?.name || '',
      'Channel Partner Code': r.channelPartner?.code || '',
      'Brand': r.brand?.name || '',
      'Brand Code': r.brand?.code || '',
      'Scanned At': r.scannedAt ? new Date(r.scannedAt).toISOString() : '',
      'Cancelled At': r.cancelledAt ? new Date(r.cancelledAt).toISOString() : '',
      'Created By': r.createdBy?.name || '',
      'Created By Email': r.createdBy?.email || '',
      'Created At': r.createdAt ? new Date(r.createdAt).toISOString() : '',
    }));

    const fields = [
      'AWB ID',
      'Status',
      'Channel Partner',
      'Channel Partner Code',
      'Brand',
      'Brand Code',
      'Scanned At',
      'Cancelled At',
      'Created By',
      'Created By Email',
      'Created At',
    ];

    const parser = new CSVParser({ fields });
    const csv = parser.parse(data);

    const filename = `awb-export-${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};





module.exports = { exportAWBCSV, exportReturnCSV };
