const Document = require('../models/document.model');

class DocumentRepository {
  async create(data) {
    const document = new Document(data);
    return await document.save();
  }

  async findByIdAndUser(id, userId) {
    return await Document.findOne({ _id: id, userId });
  }

  async findById(id) {
    return await Document.findById(id);
  }

  async findByUser(userId, { skip = 0, limit = 20 } = {}) {
    return await Document.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  async countByUser(userId) {
    return await Document.countDocuments({ userId });
  }

  async updateStatus(id, status, extra = {}) {
    return await Document.findByIdAndUpdate(
      id,
      { $set: { status, ...extra } },
      { new: true }
    );
  }

  async deleteByIdAndUser(id, userId) {
    return await Document.findOneAndDelete({ _id: id, userId });
  }
}

module.exports = new DocumentRepository();
