const storageService = require('../services/storage.service');
const parserUtil = require('../utils/parser.util');
const textChunker = require('../utils/chunker.util');
const embeddingService = require('../services/embedding.service');
const documentRepository = require('../repositories/document.repository');
const chunkRepository = require('../repositories/chunk.repository');
const logger = require('../config/logger');

class IngestionPipeline {
  /**
   * Execute ingestion process for an uploaded document record.
   *
   * @param {string} documentId
   * @param {Object} [options]
   * @param {number} [options.chunkSize]
   * @param {number} [options.chunkOverlap]
   */
  async processDocument(documentId, options = {}) {
    logger.info({ documentId }, 'Starting document ingestion pipeline');

    const document = await documentRepository.findById(documentId);
    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    try {
      // Step 1: Update status to processing
      await documentRepository.updateStatus(documentId, 'processing');

      // Step 2: Get physical file path and verify existence
      const filePath = storageService.getFilePath(document.storageKey);
      if (!storageService.fileExists(document.storageKey)) {
        throw new Error(`Document file on disk does not exist: ${document.storageKey}`);
      }

      // Step 3: Extract text (PDF, DOCX, TXT)
      const pages = await parserUtil.parseDocument(filePath, document.mimeType, document.originalFilename);

      if (!pages || pages.length === 0 || pages.every((p) => !p.content || p.content.trim().length === 0)) {
        throw new Error('No readable text could be extracted from the document');
      }

      // Step 4: Split text into chunks
      const chunks = textChunker.splitIntoChunks(pages, options);
      if (chunks.length === 0) {
        throw new Error('Document content could not be split into any valid chunks');
      }

      logger.info({ documentId, chunkCount: chunks.length }, 'Document split into chunks successfully');

      // Step 5: Clean existing chunks for this document (idempotency for retries)
      await chunkRepository.deleteByDocumentId(documentId);

      // Step 6: Generate embeddings in batches
      const chunkTexts = chunks.map((c) => c.content);
      const embeddings = await embeddingService.generateEmbeddings(chunkTexts);

      // Step 7: Prepare chunk models
      const chunkRecords = chunks.map((chunk, index) => ({
        documentId: document._id,
        userId: document.userId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        pageNumber: chunk.pageNumber,
        embedding: embeddings[index],
        metadata: {
          ...chunk.metadata,
          originalFilename: document.originalFilename
        }
      }));

      // Step 8: Bulk insert chunks
      const BATCH_SIZE = 250;
      for (let i = 0; i < chunkRecords.length; i += BATCH_SIZE) {
        const batch = chunkRecords.slice(i, i + BATCH_SIZE);
        await chunkRepository.insertMany(batch);
      }

      // Step 9: Mark document completed
      await documentRepository.updateStatus(documentId, 'completed', {
        chunkCount: chunkRecords.length,
        errorMessage: null
      });

      logger.info(
        { documentId, totalChunks: chunkRecords.length },
        'Document ingestion pipeline completed successfully'
      );

      return {
        success: true,
        documentId,
        chunkCount: chunkRecords.length
      };
    } catch (error) {
      logger.error({ err: error, documentId }, 'Document ingestion pipeline failed');

      // Safely update document to failed status with error message
      await documentRepository.updateStatus(documentId, 'failed', {
        errorMessage: error.message || 'Unknown processing error'
      });

      throw error;
    }
  }
}

module.exports = new IngestionPipeline();
