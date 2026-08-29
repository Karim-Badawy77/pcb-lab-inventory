const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const env = require('../config/env');
const ApiError = require('../utils/api-error');

const uploadDirectory = path.resolve('uploads');
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDirectory,
  filename(req, file, callback) {
    callback(null, `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: env.maxImageSizeBytes, files: env.maxImageCount },
  fileFilter(req, file, callback) {
    callback(env.allowedImageTypes.includes(file.mimetype) ? null : new ApiError(400, `Unsupported image type: ${file.mimetype}`),
      env.allowedImageTypes.includes(file.mimetype));
  }
});

module.exports = upload;
