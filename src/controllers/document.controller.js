const documentService = require('../services/document.service');

class DocumentController {
  async upload(req, res, next) {
    try {
      const document = await documentService.uploadAndProcessDocument(req.user._id, req.file);
      res.status(201).json({
        success: true,
        data: {
          document
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const { page, limit } = req.query;
      const result = await documentService.getUserDocuments(req.user._id, {
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
      const document = await documentService.getDocumentById(req.params.id, req.user._id);
      res.status(200).json({
        success: true,
        data: {
          document
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getStatus(req, res, next) {
    try {
      const status = await documentService.getDocumentStatus(req.params.id, req.user._id);
      res.status(200).json({
        success: true,
        data: {
          status
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await documentService.deleteDocument(req.params.id, req.user._id);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DocumentController();
