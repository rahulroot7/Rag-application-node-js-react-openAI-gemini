const Conversation = require('../models/conversation.model');
const Message = require('../models/message.model');

class ConversationRepository {
  async createConversation(data) {
    const conv = new Conversation(data);
    return await conv.save();
  }

  async findConversationByIdAndUser(id, userId) {
    return await Conversation.findOne({ _id: id, userId });
  }

  async findConversationsByUser(userId, { skip = 0, limit = 20 } = {}) {
    return await Conversation.find({ userId })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  async countConversationsByUser(userId) {
    return await Conversation.countDocuments({ userId });
  }

  async updateConversationTitle(id, userId, title) {
    return await Conversation.findOneAndUpdate(
      { _id: id, userId },
      { $set: { title } },
      { new: true }
    );
  }

  async deleteConversationByIdAndUser(id, userId) {
    return await Conversation.findOneAndDelete({ _id: id, userId });
  }

  async createMessage(data) {
    const msg = new Message(data);
    return await msg.save();
  }

  async findMessagesByConversationId(conversationId, { skip = 0, limit = 50 } = {}) {
    return await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);
  }

  async deleteMessagesByConversationId(conversationId) {
    return await Message.deleteMany({ conversationId });
  }
}

module.exports = new ConversationRepository();
