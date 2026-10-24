const request = require('supertest');
const app = require('../src/app');
const { connectTestDB, disconnectTestDB, clearTestDB } = require('./setup');
const User = require('../src/models/user.model');

describe('AI provider settings', () => {
  let userToken;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    const response = await request(app).post('/api/auth/register').send({
      name: 'AI Settings User',
      email: 'ai-settings@example.com',
      password: 'password123'
    });
    userToken = response.body.data.token;
  });

  it('stores a Gemini key without exposing it in settings responses', async () => {
    const update = await request(app)
      .put('/api/ai/settings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ provider: 'gemini', apiKey: 'gemini-test-key-12345' });

    expect(update.status).toBe(200);
    expect(update.body.data).toMatchObject({ aiProvider: 'gemini', hasApiKey: true });

    const settings = await request(app)
      .get('/api/ai/settings')
      .set('Authorization', `Bearer ${userToken}`);
    expect(settings.body.data).toMatchObject({ aiProvider: 'gemini', hasApiKey: true });
    expect(JSON.stringify(settings.body)).not.toContain('gemini-test-key-12345');
    expect((await User.findOne({ email: 'ai-settings@example.com' })).aiApiKey).toBe('gemini-test-key-12345');
  });

  it('requires a new key when changing providers without server key', async () => {
    const response = await request(app)
      .put('/api/ai/settings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ provider: 'gemini' });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toMatch(/API key is required/i);
  });

  it('allows selecting OpenAI without providing an API key because server key is configured', async () => {
    const response = await request(app)
      .put('/api/ai/settings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ provider: 'openai' });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      aiProvider: 'openai',
      hasApiKey: false,
      serverKeyAvailable: true
    });
  });

  it('allows clearing a custom key when server fallback is available', async () => {
    // First set custom key
    await request(app)
      .put('/api/ai/settings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ provider: 'openai', apiKey: 'sk-test-custom-openai-key-12345' });

    // Clear key to revert to server default
    const clearRes = await request(app)
      .put('/api/ai/settings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ provider: 'openai', apiKey: '' });

    expect(clearRes.status).toBe(200);
    expect(clearRes.body.data).toMatchObject({
      aiProvider: 'openai',
      hasApiKey: false,
      serverKeyAvailable: true
    });
  });
});