const multer = require('multer');
const path = require('path');

const ALLOWED_MIME_TYPES = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',                                      // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'text/plain',          // some OS sends .csv as text/plain
  'application/octet-stream', // fallback when MIME is ambiguous
]);

const ALLOWED_EXTENSIONS = new Set(['.csv', '.xls', '.xlsx']);

const storage = multer.memoryStorage(); // keep file in buffer — no disk I/O needed

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (ALLOWED_MIME_TYPES.has(file.mimetype) || ALLOWED_EXTENSIONS.has(ext)) {
    return cb(null, true);
  }

  const err = new Error(
    `Unsupported file type "${file.originalname}". Only CSV, XLS, and XLSX files are allowed.`
  );
  err.statusCode = 422;
  cb(err, false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,   // 10 MB hard cap
    files: 1,
  },
});

/**
 * Named export: use as route-level middleware
 * router.post('/missing/preview', uploadFile, ctrl.previewMissing)
 */
const uploadFile = (req, res, next) => {
  const handler = upload.single('file');
  handler(req, res, (err) => {
    if (!err) return next();

    // Multer wraps limit errors in a MulterError instance
    if (err.code === 'LIMIT_FILE_SIZE') {
      err.statusCode = 422;
      err.message = 'File size exceeds the 10 MB limit.';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      err.statusCode = 422;
      err.message = 'Unexpected field name — use "file" as the field key.';
    }

    next(err);
  });
};

module.exports = { uploadFile };