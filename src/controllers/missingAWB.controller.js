/**
 * missingAWB.controller.js
 *
 * POST /api/v1/awb/missing/preview  — upload file + dateRange → preview missing rows
 * POST /api/v1/awb/missing/save     — confirm & bulk-save missing rows
 *
 * NOTE: Brand is now required for both preview and save endpoints as per AWBRecord.js schema.
 */

const missingService = require('../services/missingAWB.service');
const { sendSuccess }  = require('../utils/response');

/**
 * Phase 1 – Preview
 * Expects multipart/form-data with:
 *   file             (CSV / XLS / XLSX)
 *   channelPartnerId (string)
 *   brandId          (string, required)
 *   startDate        (YYYY-MM-DD)
 *   endDate          (YYYY-MM-DD)
 */
const previewMissing = async (req, res, next) => {
  try {
    if (!req.file) {
      const err = new Error('No file uploaded. Use the "file" field key.');
      err.statusCode = 422;
      throw err;
    }

    const { channelPartnerId, brandId, startDate, endDate } = req.body;

    if (!channelPartnerId) {
      const err = new Error('channelPartnerId is required.');
      err.statusCode = 400;
      throw err;
    }
    if (!brandId) {
      const err = new Error('brandId is required.');
      err.statusCode = 400;
      throw err;
    }
    if (!startDate || !endDate) {
      const err = new Error('Both startDate and endDate are required.');
      err.statusCode = 400;
      throw err;
    }

    // Read and log file buffer as text (for debug; can be removed in prod)
    const fileText = req.file.buffer.toString('utf8');
    console.log('Uploaded file contents:\n', fileText);

    const result = await missingService.previewMissing({
      fileBuffer:       req.file.buffer,
      originalname:     req.file.originalname,
      channelPartnerId,
      brandId,
      startDate,
      endDate,
      userId:           req.user._id,
    });

    return sendSuccess(res, 200, 'Preview generated successfully', result);
  } catch (error) {
    next(error);
  }
};

/**
 * Phase 2 – Save
 * Expects JSON body: { rows: [...] }
 * - rows is the `missing` array returned by the preview endpoint.
 * - Brand must be present on all rows (enforced by service and schema).
 */
const saveMissing = async (req, res, next) => {
  try {
    const { rows, missingFromDate, missingToDate } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      const err = new Error('rows array is required and must not be empty.');
      err.statusCode = 400;
      throw err;
    }
    // Ensure all rows have brand, immediate check (defensive, service will recheck)
    const missingBrand = rows.some(r => !r.brand);
    if (missingBrand) {
      const err = new Error('brand is required in every row.');
      err.statusCode = 400;
      throw err;
    }

    // Validate missingFromDate and missingToDate
    if (!missingFromDate || !missingToDate) {
      const err = new Error('Both missingFromDate and missingToDate are required.');
      err.statusCode = 400;
      throw err;
    }

    

    const result = await missingService.saveMissing(
      rows,
      req.user._id,
      missingFromDate,
      missingToDate
    );

    return sendSuccess(
      res,
      201,
      `${result.saved} missing AWB(s) saved successfully${
        result.skipped ? `. ${result.skipped} skipped (already exist).` : '.'
      }`,
      result
    );
  } catch (error) {
    next(error);
  }
};

module.exports = { previewMissing, saveMissing };