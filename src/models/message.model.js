const mongoose = require('mongoose');

const citationSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true
    },
    originalFilename: {
      type: String,
      default: ''
    },
    pageNumber: {
      type: Number,
      default: 1
    },
    chunkIndex: {
      type: Number,
      default: 0
    },
    snippet: {
      type: String,
      default: ''
    },
    score: {
      type: Number,
      default: 0
    }
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Conversation ID is required'],
      index: true
    },
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: [true, 'Role is required']
    },
    content: {
      type: String,
      required: [true, 'Message content is required']
    },
    citations: {
      type: [citationSchema],
      default: []
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

// Compound index for querying conversation messages in chronological order
messageSchema.index({ conversationId: 1, createdAt: 1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
