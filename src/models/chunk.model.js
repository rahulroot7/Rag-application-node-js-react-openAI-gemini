const mongoose = require('mongoose');

const documentChunkSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: [true, 'Document ID is required'],
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    chunkIndex: {
      type: Number,
      required: [true, 'Chunk index is required']
    },
    content: {
      type: String,
      required: [true, 'Chunk content is required']
    },
    pageNumber: {
      type: Number,
      default: 1
    },
    embedding: {
      type: [Number],
      required: [true, 'Vector embedding is required']
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

// Compound index for querying all chunks of a document in order
documentChunkSchema.index({ documentId: 1, chunkIndex: 1 }, { unique: true });
// Compound index for user chunk authorization
documentChunkSchema.index({ userId: 1, documentId: 1 });

const DocumentChunk = mongoose.model('DocumentChunk', documentChunkSchema);

module.exports = DocumentChunk;
