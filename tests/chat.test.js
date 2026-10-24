const request = require('supertest');
const app = require('../src/app');
const { connectTestDB, disconnectTestDB, clearTestDB } = require('./setup');
const embeddingService = require('../src/services/embedding.service');
const llmService = require('../src/services/llm.service');
const vectorRepository = require('../src/repositories/vector.repository');
const Message = require('../src/models/message.model');
const Conversation = require('../src/models/conversation.model');

// Mock external APIs and Atlas Vector search for local testing
jest.mock('../src/services/embedding.service');
jest.mock('../src/services/llm.service');
jest.mock('../src/repositories/vector.repository');

describe('RAG Chat Pipeline Tests', () => {
  let userToken;
  let userId;

  beforeAll(async () => {
    await connectTestDB();

    embeddingService.generateEmbedding.mockResolvedValue(new Array(1536).fill(0.02));
    llmService.generateAnswer.mockResolvedValue(
      'Retrieval-Augmented Generation (RAG) retrieves relevant documents and combines them with prompts [Doc: sample.txt, Page: 1].'
    );
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    const res = await request(app).post('/api/auth/register').send({
      name: 'RAG Tester',
      email: 'rag@example.com',
      password: 'password123'
    });
    userToken = res.body.data.token;
    userId = res.body.data.user.id;
  });

  it('should successfully execute RAG flow with citations and persist messages', async () => {
    // Mock vector search output with dummy chunk result
    vectorRepository.vectorSearch.mockResolvedValue([
      {
        _id: '654321654321654321654321',
        documentId: '123456123456123456123456',
        userId: userId,
        chunkIndex: 0,
        content: 'RAG stands for Retrieval-Augmented Generation.',
        pageNumber: 1,
        score: 0.88,
        originalFilename: 'rag-guide.pdf'
      }
    ]);

    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        question: 'What is RAG?'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.answer).toContain('Retrieval-Augmented Generation');
    expect(res.body.data.citations).toHaveLength(1);
    expect(res.body.data.citations[0].originalFilename).toBe('rag-guide.pdf');
    expect(res.body.data.citations[0].score).toBe(0.88);
    expect(res.body.data.conversationId).toBeDefined();

    // Verify messages saved
    const messages = await Message.find({ conversationId: res.body.data.conversationId });
    expect(messages).toHaveLength(2); // 1 user + 1 assistant
    expect(messages[0].role).toBe('user');
    expect(messages[1].role).toBe('assistant');
    expect(messages[1].citations).toHaveLength(1);
  });

  it('should handle multi-turn conversation in the same thread', async () => {
    vectorRepository.vectorSearch.mockResolvedValue([]);

    // Turn 1
    const res1 = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        question: 'First question'
      });

    const convId = res1.body.data.conversationId;

    // Turn 2 with existing conversationId
    const res2 = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        question: 'Second follow-up question',
        conversationId: convId
      });

    expect(res2.status).toBe(200);
    expect(res2.body.data.conversationId).toBe(convId);
    const secondTurnPrompt = llmService.generateAnswer.mock.calls.at(-1)[0];
    expect(secondTurnPrompt.filter((message) => message.role === 'assistant')).toHaveLength(0);
    expect(secondTurnPrompt.some((message) => message.content === 'First question')).toBe(true);

    // Total 4 messages in conversation
    const messages = await Message.find({ conversationId: convId });
    expect(messages).toHaveLength(4);
  });

  it('should retrieve conversation history and delete conversation cleanly', async () => {
    // Create conversation via chat
    vectorRepository.vectorSearch.mockResolvedValue([]);
    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        question: 'Hello assistant'
      });

    const convId = res.body.data.conversationId;

    // Get conversations list
    const listRes = await request(app)
      .get('/api/conversations')
      .set('Authorization', `Bearer ${userToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.conversations.length).toBeGreaterThan(0);

    // Get messages for conversation
    const msgRes = await request(app)
      .get(`/api/conversations/${convId}/messages`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(msgRes.status).toBe(200);
    expect(msgRes.body.data.messages).toHaveLength(2);

    // Delete conversation
    const delRes = await request(app)
      .delete(`/api/conversations/${convId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(delRes.status).toBe(200);

    const checkConv = await Conversation.findById(convId);
    expect(checkConv).toBeNull();
    const checkMsgs = await Message.find({ conversationId: convId });
    expect(checkMsgs).toHaveLength(0);
  });
});
