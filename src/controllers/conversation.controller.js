const conversationService = require('../services/conversation.service');

class ConversationController {
  async getAll(req, res, next) {
    try {
      const { page, limit } = req.query;
      const result = await conversationService.getUserConversations(req.user._id, {
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const conversation = await conversationService.getConversationById(req.params.id, req.user._id);
      res.status(200).json({
        success: true,
        data: {
          conversation
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getMessages(req, res, next) {
    try {
      const { page, limit } = req.query;
      const messages = await conversationService.getConversationMessages(req.params.id, req.user._id, {
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 50
      });

      res.status(200).json({
        success: true,
        data: {
          messages
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await conversationService.deleteConversation(req.params.id, req.user._id);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ConversationController();
