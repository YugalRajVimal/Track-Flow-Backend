

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure the uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/svg+xml',
  'image/jpg',
]);

const ALLOWED_IMAGE_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg',
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path
      .basename(file.originalname, ext)
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '');
    cb(null, `${base}_${Date.now()}${ext}`);
  },
});

const imageFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype) || ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    return cb(null, true);
  }
  const err = new Error(
    `Unsupported file type "${file.originalname}". Only image files (JPG, PNG, GIF, etc.) are allowed.`
  );
  err.statusCode = 422;
  cb(err, false);
};

// NOTE: `files` limit bumped to 5 here so the same `upload` instance can back
// both uploadImage (1 file) and uploadImageFields (multiple named slots,
// e.g. Builty In's supplierBillPhoto + dyerReceiverChPhoto). Per-field
// maxCount below still caps each individual field at 1.
const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
});

function handleMulterError(err, next) {
  if (err.code === 'LIMIT_FILE_SIZE') {
    err.statusCode = 422;
    err.message = 'File size exceeds the 10 MB limit for images.';
  } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    err.statusCode = 422;
    err.message = `Unexpected file field "${err.field || ''}".`;
  }
  next(err);
}

/**
 * Route-level middleware for single challan photo upload.
 * Field name is 'challanPhotoUpload' to match the frontend FormData key and
 * the Mongoose schema field.
 */
const uploadImage = (req, res, next) => {
  const handler = upload.single('challanPhotoUpload');
  handler(req, res, (err) => {
    if (!err) return next();
    handleMulterError(err, next);
  });
};

/**
 * Route-level middleware factory for multiple named file fields in one
 * request, e.g.:
 *   uploadImageFields([
 *     { name: 'supplierBillPhoto', maxCount: 1 },
 *     { name: 'dyerReceiverChPhoto', maxCount: 1 },
 *   ])
 * Populates req.files as { fieldName: [file, ...] } — access via
 * req.files.supplierBillPhoto?.[0], etc.
 */
const uploadImageFields = (fields) => {
  const handler = upload.fields(fields);
  return (req, res, next) => {
    handler(req, res, (err) => {
      if (!err) return next();
      handleMulterError(err, next);
    });
  };
};

module.exports = { uploadImage, uploadImageFields, UPLOADS_DIR };