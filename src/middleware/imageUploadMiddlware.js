const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure the uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Allow only common image MIME types for uploads
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
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'
]);

// Multer disk storage config to save files in /uploads with unique filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Use timestamp plus sanitized original filename for uniqueness
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
    const timestamp = Date.now();
    cb(null, `${base}_${timestamp}${ext}`);
  }
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

const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,   // 10 MB hard cap for image uploads
    files: 1,
  },
});

/**
 * Route-level middleware for uploading images.
 * Example: router.post('/your/upload/route', uploadImage, ctrl.yourHandler)
 */
const uploadImage = (req, res, next) => {
  const handler = upload.single('file');
  handler(req, res, (err) => {
    if (!err) return next();

    // Multer wraps limit errors in a MulterError instance
    if (err.code === 'LIMIT_FILE_SIZE') {
      err.statusCode = 422;
      err.message = 'File size exceeds the 10 MB limit for images.';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      err.statusCode = 422;
      err.message = 'Unexpected field name — use "file" as the field key.';
    }

    next(err);
  });
};

module.exports = { uploadImage };