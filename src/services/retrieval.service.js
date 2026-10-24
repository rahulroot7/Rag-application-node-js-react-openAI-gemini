const embeddingService = require('../services/embedding.service');
const vectorRepository = require('../repositories/vector.repository');
const logger = require('../config/logger');

class RetrievalService {
  /**
   * Retrieve relevant chunks using Atlas Vector Search.
   *
   * @param {Object} params
   * @param {string} params.query - User natural language query
   * @param {string} params.userId - Authenticated user ID
   * @param {string[]} [params.documentIds] - Optional document filter
   * @param {number} [params.topK] - Limit of chunks
   * @param {number} [params.similarityThreshold] - Minimum score
   * @returns {Promise<Array>}
   */
  async retrieveChunks({ query, userId, documentIds = [], topK, similarityThreshold }) {
    logger.info({ userId, queryLength: query.length, documentCount: documentIds.length }, 'Retrieving chunks for query');

    // Step 1: Generate dense query vector
    const queryVector = await embeddingService.generateEmbedding(query);

    // Step 2: Search via VectorRepository ($vectorSearch)
    const results = await vectorRepository.vectorSearch({
      queryVector,
      userId,
      documentIds,
      topK,
      similarityThreshold
    });

    logger.info({ retrievedCount: results.length }, 'Chunks retrieved successfully from vector search');

    return results;
  }
}

module.exports = new RetrievalService();
