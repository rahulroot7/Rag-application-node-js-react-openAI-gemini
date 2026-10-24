const mockGenerateContent = jest.fn();
const mockOpenAICompletion = jest.fn();

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn(() => ({ generateContent: mockGenerateContent }))
  }))
}));
jest.mock('openai', () => jest.fn().mockImplementation(() => ({
  chat: { completions: { create: mockOpenAICompletion } }
})));
jest.mock('../src/models/user.model', () => ({ findById: jest.fn() }));

const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const User = require('../src/models/user.model');
const llmService = require('../src/services/llm.service');

describe('LLM provider selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateContent.mockResolvedValue({ response: { text: () => 'Gemini answer' } });
    mockOpenAICompletion.mockResolvedValue({ choices: [{ message: { content: 'OpenAI answer' } }] });
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ aiProvider: 'gemini', aiApiKey: 'gemini-test-key-12345' })
    });
  });

  it('uses the configured Gemini key and translates chat roles', async () => {
    const answer = await llmService.generateAnswer([
      { role: 'system', content: 'Answer from context only.' },
      { role: 'user', content: 'Question' },
      { role: 'assistant', content: 'Prior answer' },
      { role: 'user', content: 'Follow-up' }
    ], {}, 'user-id');

    expect(answer).toBe('Gemini answer');
    expect(GoogleGenerativeAI).toHaveBeenCalledWith('gemini-test-key-12345');
    expect(mockGenerateContent).toHaveBeenCalledWith({
      contents: [
        { role: 'user', parts: [{ text: 'Question' }] },
        { role: 'model', parts: [{ text: 'Prior answer' }] },
        { role: 'user', parts: [{ text: 'Follow-up' }] }
      ]
    });
  });

  it('uses the configured OpenAI key to create the account client', async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ aiProvider: 'openai', aiApiKey: 'openai-test-key-12345' })
    });

    const answer = await llmService.generateAnswer([{ role: 'user', content: 'Question' }], {}, 'user-id');

    expect(answer).toBe('OpenAI answer');
    expect(OpenAI).toHaveBeenCalledWith({ apiKey: 'openai-test-key-12345' });
    expect(mockOpenAICompletion).toHaveBeenCalled();
  });

  it('falls back to server OpenAI key when user has no personal key configured', async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ aiProvider: 'openai', aiApiKey: null, aiKeys: {} })
    });

    const answer = await llmService.generateAnswer([{ role: 'user', content: 'Question' }], {}, 'user-id');

    expect(answer).toBe('OpenAI answer');
  });
});