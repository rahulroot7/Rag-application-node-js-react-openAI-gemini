const DocumentChunk = require('../models/chunk.model');

class ChunkRepository {
  async insertMany(chunks, options = {}) {
    return await DocumentChunk.insertMany(chunks, options);
  }

  async deleteByDocumentId(documentId, options = {}) {
    return await DocumentChunk.deleteMany({ documentId }, options);
  }

  async deleteByDocumentIdAndUser(documentId, userId, options = {}) {
    return await DocumentChunk.deleteMany({ documentId, userId }, options);
  }

  async findByDocumentId(documentId, { skip = 0, limit = 50 } = {}) {
    return await DocumentChunk.find({ documentId })
      .sort({ chunkIndex: 1 })
      .skip(skip)
      .limit(limit);
  }

  async countByDocumentId(documentId) {
    return await DocumentChunk.countDocuments({ documentId });
  }
}

module.exports = new ChunkRepository();
