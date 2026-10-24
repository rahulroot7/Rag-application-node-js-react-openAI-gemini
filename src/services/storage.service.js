const fs = require('fs');
const path = require('path');
const env = require('../config/env');
const logger = require('../config/logger');

class StorageService {
  constructor() {
    this.uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  getFilePath(storageKey) {
    // Prevent directory traversal
    const safeKey = path.basename(storageKey);
    return path.join(this.uploadDir, safeKey);
  }

  async deleteFile(storageKey) {
    try {
      const filePath = this.getFilePath(storageKey);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        logger.info({ storageKey }, 'Uploaded file deleted from storage');
      }
    } catch (error) {
      logger.error({ err: error, storageKey }, 'Failed to delete file from storage');
      // Do not throw to avoid crashing parent cleanup workflows
    }
  }

  fileExists(storageKey) {
    const filePath = this.getFilePath(storageKey);
    return fs.existsSync(filePath);
  }
}

module.exports = new StorageService();
