const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const env = require('../config/env');

// Ensure upload directory exists
const uploadDirPath = path.resolve(process.cwd(), env.UPLOAD_DIR);
if (!fs.existsSync(uploadDirPath)) {
  fs.mkdirSync(uploadDirPath, { recursive: true });
}

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirPath);
  },
  filename: (req, file, cb) => {
    // Generate secure randomized unique filename to avoid path traversal & collisions
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.pdf', '.docx', '.txt'];

  if (ALLOWED_MIME_TYPES.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    const error = new Error('Unsupported file type. Only PDF, DOCX, and TXT files are accepted.');
    error.code = 'UNSUPPORTED_FILE_TYPE';
    cb(error, false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: env.MAX_FILE_SIZE
  },
  fileFilter
});

module.exports = upload;
