require('dotenv').config();

const env = {
  port: Number(process.env.PORT || 3000),
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pcb-inventory',
  maxImageCount: Number(process.env.MAX_IMAGE_COUNT || 10),
  maxImageSizeBytes: Number(process.env.MAX_IMAGE_SIZE_BYTES || 5242880),
  allowedImageTypes: (process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/webp').split(',')
};

module.exports = env;
