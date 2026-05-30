/**
 * missingAWB.controller.js
 *
 * POST /api/v1/awb/missing/preview  — upload file + dateRange + brandId → preview missing rows
 * POST /api/v1/awb/missing/save     — confirm & bulk-save missing rows
 */

const missingService = require('../services/missingReturn.service');
const { sendSuccess }  = require('../utils/response');

/**
 * Phase 1 – Preview
 * Expects multipart/form-data with:
 *   file             (CSV / XLS / XLSX)
 *   channelPartnerId (string)
 *   brandId          (string)   // --- Brand is required now
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

    // Read and log file buffer as text
    const fileText = req.file.buffer.toString('utf8');
    console.log('Uploaded file contents:\n', fileText);

    const result = await missingService.previewMissing({
      fileBuffer:       req.file.buffer,
      originalname:     req.file.originalname,
      channelPartnerId,
      brandId, // pass in brandId - required
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
 * rows is the `missing` array returned by the preview endpoint.
 * Each row MUST include brand.
 */
const saveMissing = async (req, res, next) => {
  try {
    const { rows } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      const err = new Error('rows array is required and must not be empty.');
      err.statusCode = 400;
      throw err;
    }

    // Optionally: Validate that every row contains brand
    for (const row of rows) {
      if (!row.brand) {
        const err = new Error('Each row must include a brand. Brand is required for all rows.');
        err.statusCode = 400;
        throw err;
      }
    }

    const result = await missingService.saveMissing(rows, req.user._id);

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