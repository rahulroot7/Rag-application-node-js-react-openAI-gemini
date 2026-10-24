const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

const authRoutes = require('./routes/auth.routes');
const documentRoutes = require('./routes/document.routes');
const chatRoutes = require('./routes/chat.routes');
const conversationRoutes = require('./routes/conversation.routes');
const aiRoutes = require('./routes/ai.routes');
const healthRoutes = require('./routes/health.routes');
const errorHandler = require('./middleware/error.middleware');
const logger = require('./config/logger');

const app = express();

// Secure HTTP headers
app.use(helmet());

// Explicit CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID']
  })
);

// Correlation ID & Request timing middleware
app.use((req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);

  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      logger.info(
        {
          correlationId,
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          durationMs: duration
        },
        'HTTP Request Completed'
      );
    }
  });

  next();
});

// Parse JSON and urlencoded request bodies
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Serve static frontend assets (excluded from rate limiting)
const path = require('path');
app.use(express.static(path.join(__dirname, '../public')));

// Mount Health and Readiness check endpoints (excluded from rate limiting)
app.use('/', healthRoutes);

// Rate Limiting: 30 seconds window as requested
const limiter = rateLimit({
  windowMs: 30 * 1000, // 30 seconds
  max: process.env.NODE_ENV === 'test' ? 1000 : 200, // 200 requests per 30 seconds per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests from this IP, please try again after 30 seconds'
    }
  }
});

// Apply rate limiter to API endpoints
app.use('/api', limiter);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/ai', aiRoutes);

// Catch-all 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`
    }
  });
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
