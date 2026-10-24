const openai = require('../config/openai');
const env = require('../config/env');
const logger = require('../config/logger');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class EmbeddingService {
  /**
   * Generate vector embedding for a single text string.
   *
   * @param {string} text
   * @returns {Promise<number[]>}
   */
  async generateEmbedding(text) {
    const vectors = await this.generateEmbeddings([text]);
    return vectors[0];
  }

  /**
   * Generate vector embeddings for an array of text strings (supports batching).
   * Supports OpenAI or Gemini embeddings depending on configured API keys.
   *
   * @param {string[]} texts
   * @param {number} [batchSize=100]
   * @returns {Promise<Array<number[]>>}
   */
  async generateEmbeddings(texts, batchSize = 100) {
    if (!texts || texts.length === 0) {
      return [];
    }

    const hasOpenAI = !!(env.OPENAI_API_KEY && env.OPENAI_API_KEY.trim().length > 0);
    const hasGemini = !!(env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0);

    if (!hasOpenAI && !hasGemini) {
      throw new Error('Cannot generate embeddings: please configure OPENAI_API_KEY or GEMINI_API_KEY in .env');
    }

    const allVectors = [];

    // Use OpenAI embeddings if OPENAI_API_KEY is configured
    if (hasOpenAI) {
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        try {
          const response = await openai.embeddings.create({
            model: env.OPENAI_EMBEDDING_MODEL,
            input: batch,
            dimensions: env.EMBEDDING_DIMENSIONS
          });

          // Ensure ordering by index
          const sortedData = response.data.sort((a, b) => a.index - b.index);
          for (const item of sortedData) {
            allVectors.push(item.embedding);
          }
        } catch (error) {
          logger.error({ err: error, batchCount: batch.length }, 'OpenAI Embedding generation failed');
          throw error;
        }
      }
      return allVectors;
    }

    // Fall back to Gemini embeddings if OPENAI_API_KEY is not configured
    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    const geminiModel = genAI.getGenerativeModel({ model: env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001' });

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      try {
        const batchResult = await geminiModel.batchEmbedContents({
          requests: batch.map((text) => ({
            content: { parts: [{ text }] },
            outputDimensionality: env.EMBEDDING_DIMENSIONS
          }))
        });

        for (const item of batchResult.embeddings) {
          allVectors.push(item.values);
        }
      } catch (error) {
        logger.error({ err: error, batchCount: batch.length }, 'Gemini Embedding generation failed');
        throw error;
      }
    }

    return allVectors;
  }
}

module.exports = new EmbeddingService();
