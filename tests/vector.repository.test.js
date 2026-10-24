jest.mock('../src/models/chunk.model', () => ({
  find: jest.fn()
}));

const mongoose = require('mongoose');
const DocumentChunk = require('../src/models/chunk.model');
const vectorRepository = require('../src/repositories/vector.repository');

describe('VectorRepository local vector search', () => {
  it('uses Atlas-compatible normalized cosine scores for threshold filtering', async () => {
    const query = {
      populate: jest.fn(),
      lean: jest.fn(),
      exec: jest.fn().mockResolvedValue([
        {
          _id: new mongoose.Types.ObjectId(),
          documentId: { _id: new mongoose.Types.ObjectId(), originalFilename: 'policy.pdf' },
          userId: new mongoose.Types.ObjectId(),
          embedding: [0.6, 0.8],
          content: 'Employees may work remotely up to 2 days per week.',
          chunkIndex: 0,
          pageNumber: 1
        }
      ])
    };
    query.populate.mockReturnValue(query);
    query.lean.mockReturnValue(query);
    DocumentChunk.find.mockReturnValue(query);

    const results = await vectorRepository.localVectorSearch({
      queryVector: [1, 0],
      userId: new mongoose.Types.ObjectId().toString(),
      topK: 5,
      similarityThreshold: 0.7
    });

    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(0.8);
  });
});