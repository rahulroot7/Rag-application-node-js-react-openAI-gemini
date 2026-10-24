const path = require('path');
const documentRepository = require('../repositories/document.repository');
const chunkRepository = require('../repositories/chunk.repository');
const storageService = require('./storage.service');
const ingestionPipeline = require('../pipelines/ingestion.pipeline');
const logger = require('../config/logger');

class DocumentService {
  /**
   * Register a new document and trigger ingestion
   */
  async uploadAndProcessDocument(userId, file) {
    if (!file) {
      const error = new Error('No document file was uploaded');
      error.statusCode = 400;
      throw error;
    }

    const storageKey = file.filename;

    // Create initial document record with pending status
    const document = await documentRepository.create({
      userId,
      originalFilename: file.originalname,
      storageKey,
      mimeType: file.mimetype,
      fileSize: file.size,
      status: 'pending'
    });

    // In synchronous/default mode, run ingestion pipeline
    // (If queue is enabled, job can be dispatched, but process immediately as default)
    try {
      await ingestionPipeline.processDocument(document._id);
      return await documentRepository.findById(document._id);
    } catch (ingestionErr) {
      logger.error({ err: ingestionErr, documentId: document._id }, 'Ingestion pipeline error during upload');
      // Return the updated document record showing failed status
      return await documentRepository.findById(document._id);
    }
  }

  async getUserDocuments(userId, { page = 1, limit = 20 } = {}) {
    const skip = (page - 1) * limit;
    const [documents, total] = await Promise.all([
      documentRepository.findByUser(userId, { skip, limit }),
      documentRepository.countByUser(userId)
    ]);

    return {
      documents,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getDocumentById(documentId, userId) {
    const document = await documentRepository.findByIdAndUser(documentId, userId);
    if (!document) {
      const error = new Error('Document not found or unauthorized');
      error.statusCode = 404;
      throw error;
    }
    return document;
  }

  async getDocumentStatus(documentId, userId) {
    const document = await this.getDocumentById(documentId, userId);
    return {
      id: document._id,
      originalFilename: document.originalFilename,
      status: document.status,
      chunkCount: document.chunkCount,
      errorMessage: document.errorMessage,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt
    };
  }

  async deleteDocument(documentId, userId) {
    const document = await documentRepository.findByIdAndUser(documentId, userId);
    if (!document) {
      const error = new Error('Document not found or unauthorized');
      error.statusCode = 404;
      throw error;
    }

    // Step 1: Delete all associated chunks
    await chunkRepository.deleteByDocumentIdAndUser(documentId, userId);

    // Step 2: Delete physical file from storage
    await storageService.deleteFile(document.storageKey);

    // Step 3: Delete document record
    await documentRepository.deleteByIdAndUser(documentId, userId);

    logger.info({ documentId, userId }, 'Document and associated vector chunks deleted successfully');

    return { message: 'Document and associated vectors deleted successfully' };
  }
}

module.exports = new DocumentService();
