const path = require('path');
const dotenv = require('dotenv');
const { z } = require('zod');

// Determine env file based on NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development';
if (nodeEnv === 'test') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });
} else {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters long'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  OPENAI_API_KEY: z.string().optional().default(''),
  OPENAI_CHAT_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_CHAT_MODEL: z.string().default('gemini-3.8-flash'),
  GEMINI_EMBEDDING_MODEL: z.string().default('gemini-embedding-001'),
  EMBEDDING_DIMENSIONS: z.coerce.number().default(1536),
  VECTOR_SEARCH_INDEX_NAME: z.string().default('vector_index'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  ENABLE_REDIS_QUEUE: z.string().transform((val) => val === 'true').default('false'),
  UPLOAD_DIR: z.string().default('uploads'),
  MAX_FILE_SIZE: z.coerce.number().default(10 * 1024 * 1024), // 10MB
  CHUNK_SIZE: z.coerce.number().default(500),
  CHUNK_OVERLAP: z.coerce.number().default(50),
  TOP_K: z.coerce.number().default(5),
  SIMILARITY_THRESHOLD: z.coerce.number().default(0.7)
});

let parsedEnv;
try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    const errorDetails = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`Invalid environment configuration: ${errorDetails}`);
  }
  throw error;
}

module.exports = parsedEnv;
