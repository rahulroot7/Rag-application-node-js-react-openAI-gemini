const ragService = require('../services/rag.service');

class ChatController {
  async chat(req, res, next) {
    try {
      const { question, conversationId, documentIds, topK, similarityThreshold } = req.body;
      const result = await ragService.answerQuestion({
        userId: req.user._id,
        question,
        conversationId,
        documentIds,
        topK,
        similarityThreshold
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ChatController();
