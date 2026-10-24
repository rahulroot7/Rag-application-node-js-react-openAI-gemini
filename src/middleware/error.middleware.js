const multer = require('multer');
const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(
    {
      err: {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        code: err.code
      },
      url: req.originalUrl,
      method: req.method,
      userId: req.user ? req.user._id : undefined
    },
    'Handled Application Error'
  );

  // Multer errors (e.g. file too large)
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: `File size exceeds the allowed limit of ${Math.round(process.env.MAX_FILE_SIZE / (1024 * 1024) || 10)}MB`
        }
      });
    }
    return res.status(400).json({
      success: false,
      error: {
        code: err.code,
        message: err.message
      }
    });
  }

  if (err.code === 'UNSUPPORTED_FILE_TYPE') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'UNSUPPORTED_FILE_TYPE',
        message: err.message
      }
    });
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: `Invalid ID format for parameter '${err.path}'`
      }
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      error: {
        code: 'CONFLICT',
        message: `A record with this ${field} already exists`
      }
    });
  }

  // Atlas Vector Search specific error
  if (err.code === 'ATLAS_VECTOR_SEARCH_UNSUPPORTED') {
    return res.status(501).json({
      success: false,
      error: {
        code: err.code,
        message: err.message
      }
    });
  }

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 && process.env.NODE_ENV === 'production'
    ? 'Internal Server Error'
    : err.message || 'An unexpected error occurred';

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message
    }
  });
};

module.exports = errorHandler;
