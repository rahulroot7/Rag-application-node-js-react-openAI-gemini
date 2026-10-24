const mongoose = require('mongoose');
const DocumentChunk = require('../models/chunk.model');
const env = require('../config/env');
const logger = require('../config/logger');

class VectorRepository {
  /**
   * Cosine similarity helper for local vectors (used when running against local MongoDB)
   */
  calculateCosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  /**
   * Local vector search fallback using in-memory cosine similarity over user chunks.
   * Enables local development against mongodb://localhost:27017/ without Atlas requirement.
   */
  async localVectorSearch({
    queryVector,
    userId,
    documentIds = [],
    topK = env.TOP_K,
    similarityThreshold = env.SIMILARITY_THRESHOLD,
    metadataFilter = {}
  }) {
    logger.info({ userId }, 'Running local vector similarity search fallback');
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const filterConditions = {
      userId: userObjectId
    };

    if (documentIds && documentIds.length > 0) {
      filterConditions.documentId = {
        $in: documentIds.map((id) => new mongoose.Types.ObjectId(id))
      };
    }

    if (metadataFilter && Object.keys(metadataFilter).length > 0) {
      Object.assign(filterConditions, metadataFilter);
    }

    // Retrieve matching chunks with populated document metadata
    const chunks = await DocumentChunk.find(filterConditions)
      .populate('documentId', 'originalFilename')
      .lean()
      .exec();

    // Compute cosine similarity score for each candidate chunk
    const scoredChunks = [];
    for (const chunk of chunks) {
      if (!chunk.embedding || chunk.embedding.length === 0) continue;
      // Atlas Vector Search returns cosine scores mapped from [-1, 1] to [0, 1].
      const cosineSimilarity = this.calculateCosineSimilarity(queryVector, chunk.embedding);
      const score = (cosineSimilarity + 1) / 2;
      if (score >= similarityThreshold) {
        scoredChunks.push({
          _id: chunk._id,
          documentId: chunk.documentId?._id || chunk.documentId,
          userId: chunk.userId,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          pageNumber: chunk.pageNumber,
          metadata: chunk.metadata,
          score: parseFloat(score.toFixed(4)),
          originalFilename: chunk.documentId?.originalFilename || chunk.metadata?.originalFilename || 'Document'
        });
      }
    }

    // Sort descending by similarity score and take topK
    scoredChunks.sort((a, b) => b.score - a.score);
    return scoredChunks.slice(0, topK);
  }

  /**
   * Perform Vector Search.
   * Tries Atlas Vector Search ($vectorSearch stage) first.
   * If running locally or on standalone MongoDB without Atlas Search index, falls back seamlessly
   * to local cosine similarity search so the app works seamlessly out-of-the-box locally.
   */
  async vectorSearch({
    queryVector,
    userId,
    documentIds = [],
    topK = env.TOP_K,
    similarityThreshold = env.SIMILARITY_THRESHOLD,
    metadataFilter = {}
  }) {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const filterConditions = {
      userId: userObjectId
    };

    if (documentIds && documentIds.length > 0) {
      filterConditions.documentId = {
        $in: documentIds.map((id) => new mongoose.Types.ObjectId(id))
      };
    }

    if (metadataFilter && Object.keys(metadataFilter).length > 0) {
      Object.assign(filterConditions, metadataFilter);
    }

    const numCandidates = Math.max(topK * 10, 50);

    const pipeline = [
      {
        $vectorSearch: {
          index: env.VECTOR_SEARCH_INDEX_NAME,
          path: 'embedding',
          queryVector: queryVector,
          numCandidates: numCandidates,
          limit: topK,
          filter: filterConditions
        }
      },
      {
        $project: {
          _id: 1,
          documentId: 1,
          userId: 1,
          chunkIndex: 1,
          content: 1,
          pageNumber: 1,
          metadata: 1,
          score: { $meta: 'vectorSearchScore' }
        }
      },
      {
        $match: {
          score: { $gte: similarityThreshold }
        }
      },
      {
        $lookup: {
          from: 'documents',
          localField: 'documentId',
          foreignField: '_id',
          as: 'document'
        }
      },
      {
        $unwind: {
          path: '$document',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          documentId: 1,
          userId: 1,
          chunkIndex: 1,
          content: 1,
          pageNumber: 1,
          metadata: 1,
          score: 1,
          originalFilename: '$document.originalFilename'
        }
      }
    ];

    try {
      return await DocumentChunk.aggregate(pipeline).exec();
    } catch (error) {
      // If $vectorSearch is unsupported (e.g. running on local MongoDB instance), fallback to local cosine similarity
      if (
        error.message &&
        (error.message.includes('$vectorSearch') ||
          error.message.includes('Unrecognized pipeline stage') ||
          error.message.includes('Index not found') ||
          error.codeName === 'CommandNotSupportedOnReplicaSet')
      ) {
        logger.warn(
          'Atlas $vectorSearch not supported on this MongoDB instance. Seamlessly falling back to local exact cosine similarity search.'
        );
        return await this.localVectorSearch({
          queryVector,
          userId,
          documentIds,
          topK,
          similarityThreshold,
          metadataFilter
        });
      }
      logger.error({ err: error }, 'Atlas Vector Search aggregation failed');
      throw error;
    }
  }
}

module.exports = new VectorRepository();
