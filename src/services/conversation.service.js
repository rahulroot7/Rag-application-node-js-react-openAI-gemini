const conversationRepository = require('../repositories/conversation.repository');

class ConversationService {
  async getUserConversations(userId, { page = 1, limit = 20 } = {}) {
    const skip = (page - 1) * limit;
    const [conversations, total] = await Promise.all([
      conversationRepository.findConversationsByUser(userId, { skip, limit }),
      conversationRepository.countConversationsByUser(userId)
    ]);

    return {
      conversations,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getConversationById(id, userId) {
    const conversation = await conversationRepository.findConversationByIdAndUser(id, userId);
    if (!conversation) {
      const error = new Error('Conversation not found or unauthorized');
      error.statusCode = 404;
      throw error;
    }
    return conversation;
  }

  async getConversationMessages(conversationId, userId, { page = 1, limit = 50 } = {}) {
    // Verify conversation ownership
    await this.getConversationById(conversationId, userId);

    const skip = (page - 1) * limit;
    const messages = await conversationRepository.findMessagesByConversationId(conversationId, {
      skip,
      limit
    });

    return messages;
  }

  async deleteConversation(id, userId) {
    const conversation = await conversationRepository.findConversationByIdAndUser(id, userId);
    if (!conversation) {
      const error = new Error('Conversation not found or unauthorized');
      error.statusCode = 404;
      throw error;
    }

    // Delete messages
    await conversationRepository.deleteMessagesByConversationId(id);

    // Delete conversation
    await conversationRepository.deleteConversationByIdAndUser(id, userId);

    return { message: 'Conversation deleted successfully' };
  }
}

module.exports = new ConversationService();
