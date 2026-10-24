const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required']
    },
    aiProvider: {
      type: String,
      enum: ['openai', 'gemini'],
      default: () => {
        try {
          const env = require('../config/env');
          if (env.OPENAI_API_KEY && env.OPENAI_API_KEY.trim().length > 0) return 'openai';
          if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0) return 'gemini';
        } catch (_) {}
        return 'openai';
      }
    },
    aiApiKey: {
      type: String,
      default: null
    },
    aiKeys: {
      openai: { type: String, default: null },
      gemini: { type: String, default: null }
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.aiApiKey;  // never expose key in API responses
        delete ret.aiKeys;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Index on email is registered via unique: true above
// userSchema.index({ email: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);

module.exports = User;
