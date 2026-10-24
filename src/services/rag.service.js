const retrievalService = require('./retrieval.service');
const llmService = require('./llm.service');
const conversationRepository = require('../repositories/conversation.repository');
const { buildChatMessages } = require('../prompts/rag.prompt');
const logger = require('../config/logger');

class RAGService {
  /**
   * Orchestrate question answering over retrieved chunks and conversation context
   *
   * @param {Object} params
   * @param {string} params.userId
   * @param {string} params.question
   * @param {string} [params.conversationId]
   * @param {string[]} [params.documentIds]
   * @param {number} [params.topK]
   * @param {number} [params.similarityThreshold]
   */
  async answerQuestion({
    userId,
    question,
    conversationId,
    documentIds = [],
    topK,
    similarityThreshold
  }) {
    logger.info({ userId, conversationId }, 'Initiating RAG question answering pipeline');

    // Step 1: Manage or create Conversation
    let conversation;
    if (conversationId) {
      conversation = await conversationRepository.findConversationByIdAndUser(conversationId, userId);
      if (!conversation) {
        const error = new Error('Conversation not found or unauthorized');
        error.statusCode = 404;
        throw error;
      }
    } else {
      // Auto-create a new conversation with a title derived from first question
      const defaultTitle = question.slice(0, 50).trim() + (question.length > 50 ? '...' : '');
      conversation = await conversationRepository.createConversation({
        userId,
        title: defaultTitle
      });
    }

    // Step 2: Load recent conversation history (last 6 messages for context)
    const recentMessages = await conversationRepository.findMessagesByConversationId(conversation._id, {
      limit: 6
    });

    const historyForPrompt = recentMessages.filter((message) => message.role === 'user').map((m) => ({
      role: m.role,
      content: m.content
    }));

    // Step 3: Retrieve relevant document chunks via vector search
    let retrievedChunks = [];
    try {
      retrievedChunks = await retrievalService.retrieveChunks({
        query: question,
        userId,
        documentIds,
        topK,
        similarityThreshold
      });
    } catch (err) {
      // If Atlas Vector search is not configured or unsupported, propagate or handle explicitly
      logger.error({ err }, 'Error in chunk retrieval stage of RAG pipeline');
      throw err;
    }

    // Step 4: Construct source citations from retrieved chunks
    const citations = retrievedChunks.map((chunk) => ({
      documentId: chunk.documentId,
      originalFilename: chunk.originalFilename || 'Document',
      pageNumber: chunk.pageNumber || 1,
      chunkIndex: chunk.chunkIndex || 0,
      snippet: chunk.content ? chunk.content.slice(0, 200) + '...' : '',
      score: chunk.score ? parseFloat(chunk.score.toFixed(4)) : 0
    }));

    // Step 5: Build chat prompt messages
    const chatMessages = buildChatMessages({
      question,
      contextChunks: retrievedChunks,
      conversationHistory: historyForPrompt
    });

    // Step 6: Generate answer via LLM
    const answer = await llmService.generateAnswer(chatMessages, {}, userId);

    // Step 7: Persist user and assistant messages
    await conversationRepository.createMessage({
      conversationId: conversation._id,
      role: 'user',
      content: question,
      citations: []
    });

    const assistantMessage = await conversationRepository.createMessage({
      conversationId: conversation._id,
      role: 'assistant',
      content: answer,
      citations: citations
    });

    // Update conversation timestamp
    await conversationRepository.updateConversationTitle(conversation._id, userId, conversation.title);

    return {
      conversationId: conversation._id,
      messageId: assistantMessage._id,
      question,
      answer,
      citations,
      contextRetrieved: retrievedChunks.length > 0
    };
  }
}

module.exports = new RAGService();
