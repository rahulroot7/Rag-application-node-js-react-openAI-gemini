const { z } = require('zod');
const mongoose = require('mongoose');

const objectIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: 'Invalid MongoDB ObjectId format'
});

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password too long')
  })
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required')
  })
});

const chatSchema = z.object({
  body: z.object({
    question: z.string().min(1, 'Question cannot be empty').max(4000),
    conversationId: objectIdSchema.optional(),
    documentIds: z.array(objectIdSchema).optional(),
    topK: z.number().int().positive().max(20).optional(),
    similarityThreshold: z.number().min(0).max(1).optional()
  })
});

const documentParamSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});

const conversationParamSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});

const paginationQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20)
  })
});

module.exports = {
  objectIdSchema,
  registerSchema,
  loginSchema,
  chatSchema,
  documentParamSchema,
  conversationParamSchema,
  paginationQuerySchema
};
