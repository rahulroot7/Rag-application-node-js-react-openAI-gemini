const openai = require('../config/openai');
const OpenAI = require('openai');
const env = require('../config/env');
const logger = require('../config/logger');
const User = require('../models/user.model');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class LLMService {
  /**
  * Generate a completion with the provider and key configured for the user.
   *
   * @param {Array<{ role: string, content: string }>} messages
   * @param {Object} [options]
   * @param {number} [options.temperature]
   * @param {number} [options.maxTokens]
   * @param {string} userId
   * @returns {Promise<string>}
   */
  async generateAnswer(messages, options = {}, userId) {
    try {
      const user = userId
        ? await User.findById(userId).select('aiProvider aiApiKey aiKeys')
        : null;
      const defaultProvider = (env.OPENAI_API_KEY && env.OPENAI_API_KEY.trim().length > 0)
        ? 'openai'
        : ((env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0) ? 'gemini' : 'openai');

      let provider = user?.aiProvider || defaultProvider;

      const getProviderKey = (p) => {
        const uKey = user?.aiKeys?.[p] || (user?.aiProvider === p && user?.aiApiKey ? user.aiApiKey : null);
        const sKey = p === 'gemini' ? (env.GEMINI_API_KEY || null) : (env.OPENAI_API_KEY || null);
        return (uKey && uKey.trim().length > 0) ? uKey : ((sKey && sKey.trim().length > 0) ? sKey : null);
      };

      let apiKey = getProviderKey(provider);

      // If user's selected provider has no key, check if the other provider has a valid key configured
      if (!apiKey) {
        const alternativeProvider = provider === 'openai' ? 'gemini' : 'openai';
        const altKey = getProviderKey(alternativeProvider);
        if (altKey) {
          logger.info({ from: provider, to: alternativeProvider }, 'Selected AI provider has no key; automatically switching to available provider');
          provider = alternativeProvider;
          apiKey = altKey;
        }
      }

      if (!apiKey) {
        const error = new Error(`Configure an API key for ${provider} in AI settings or set ${provider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY'} in server environment`);
        error.statusCode = 400;
        throw error;
      }

      if (provider === 'gemini') {
        const systemMessage = messages.find((message) => message.role === 'system');
        const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
          model: env.GEMINI_CHAT_MODEL,
          ...(systemMessage ? { systemInstruction: systemMessage.content } : {}),
          generationConfig: {
            temperature: options.temperature !== undefined ? options.temperature : 0.2,
            maxOutputTokens: options.maxTokens || 1500
          }
        });
        const contents = messages
          .filter((message) => message.role !== 'system')
          .map((message) => ({
            role: message.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: message.content }]
          }));
        const result = await model.generateContent({ contents });
        const answer = result.response.text();
        if (!answer) throw new Error('Empty response received from Gemini model');
        return answer.trim();
      }

      const userCustomKey = user?.aiKeys?.[provider] || (user?.aiProvider === provider && user?.aiApiKey ? user.aiApiKey : null);
      const client = userCustomKey ? new OpenAI({ apiKey: userCustomKey }) : openai;
      const response = await client.chat.completions.create({
        model: env.OPENAI_CHAT_MODEL,
        messages: messages,
        temperature: options.temperature !== undefined ? options.temperature : 0.2, // low temp for grounding
        max_tokens: options.maxTokens || 1500
      });

      const choice = response.choices && response.choices[0];
      if (!choice || !choice.message || !choice.message.content) {
        throw new Error('Empty response received from LLM model');
      }

      return choice.message.content.trim();
    } catch (error) {
      logger.error({ err: error }, 'AI chat completion failed');
      throw error;
    }
  }
}

module.exports = new LLMService();
