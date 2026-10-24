const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    originalFilename: {
      type: String,
      required: [true, 'Original filename is required'],
      trim: true
    },
    storageKey: {
      type: String,
      required: [true, 'Storage key is required']
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required']
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required']
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true
    },
    errorMessage: {
      type: String,
      default: null
    },
    chunkCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Compound index for user documents ownership and sorting
documentSchema.index({ userId: 1, createdAt: -1 });

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;
