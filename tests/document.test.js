const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../src/app');
const { connectTestDB, disconnectTestDB, clearTestDB } = require('./setup');
const embeddingService = require('../src/services/embedding.service');
const Document = require('../src/models/document.model');
const DocumentChunk = require('../src/models/chunk.model');

// Mock embeddingService to avoid paid OpenAI API calls in tests
jest.mock('../src/services/embedding.service');

describe('Document Upload & Ingestion Tests', () => {
  let user1Token;
  let user2Token;
  let testTxtPath;

  beforeAll(async () => {
    await connectTestDB();

    // Create a temporary text file for testing uploads
    testTxtPath = path.join(__dirname, 'sample-test.txt');
    fs.writeFileSync(
      testTxtPath,
      'Antigravity RAG Architecture.\nThis document explains how vector embeddings are created and stored.'
    );

    // Mock embedding response
    embeddingService.generateEmbeddings.mockResolvedValue([
      new Array(1536).fill(0.01)
    ]);
  });

  afterAll(async () => {
    if (fs.existsSync(testTxtPath)) {
      fs.unlinkSync(testTxtPath);
    }
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    // Register User 1
    const res1 = await request(app).post('/api/auth/register').send({
      name: 'User One',
      email: 'user1@example.com',
      password: 'password123'
    });
    user1Token = res1.body.data.token;

    // Register User 2
    const res2 = await request(app).post('/api/auth/register').send({
      name: 'User Two',
      email: 'user2@example.com',
      password: 'password123'
    });
    user2Token = res2.body.data.token;
  });

  it('should upload and ingest a valid text document successfully', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${user1Token}`)
      .attach('file', testTxtPath);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.document.status).toBe('completed');
    expect(res.body.data.document.chunkCount).toBeGreaterThan(0);

    // Verify chunks were created in database
    const chunks = await DocumentChunk.find({ documentId: res.body.data.document._id });
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].embedding).toHaveLength(1536);
  });

  it('should reject file upload without authentication', async () => {
    const res = await request(app)
      .post('/api/documents')
      .attach('file', testTxtPath);

    expect(res.status).toBe(401);
  });

  it('should enforce multi-tenant isolation: User 2 cannot access User 1 document', async () => {
    // User 1 uploads document
    const uploadRes = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${user1Token}`)
      .attach('file', testTxtPath);

    const docId = uploadRes.body.data.document._id;

    // User 1 can access
    const user1Get = await request(app)
      .get(`/api/documents/${docId}`)
      .set('Authorization', `Bearer ${user1Token}`);
    expect(user1Get.status).toBe(200);

    // User 2 cannot access
    const user2Get = await request(app)
      .get(`/api/documents/${docId}`)
      .set('Authorization', `Bearer ${user2Token}`);
    expect(user2Get.status).toBe(404);

    // User 2 cannot delete
    const user2Del = await request(app)
      .delete(`/api/documents/${docId}`)
      .set('Authorization', `Bearer ${user2Token}`);
    expect(user2Del.status).toBe(404);
  });

  it('should delete document and clean up all associated chunks', async () => {
    const uploadRes = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${user1Token}`)
      .attach('file', testTxtPath);

    const docId = uploadRes.body.data.document._id;

    const delRes = await request(app)
      .delete(`/api/documents/${docId}`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(delRes.status).toBe(200);

    // Verify document record deleted
    const doc = await Document.findById(docId);
    expect(doc).toBeNull();

    // Verify chunks deleted
    const chunks = await DocumentChunk.find({ documentId: docId });
    expect(chunks).toHaveLength(0);
  });
});
