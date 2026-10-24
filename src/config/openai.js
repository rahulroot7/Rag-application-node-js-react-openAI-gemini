const OpenAI = require('openai');
const env = require('./env');

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY || 'placeholder-openai-key'
});

module.exports = openai;
