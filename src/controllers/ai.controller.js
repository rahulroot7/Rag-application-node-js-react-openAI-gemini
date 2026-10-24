const User = require('../models/user.model');
const env = require('../config/env');

const SUPPORTED_PROVIDERS = ['openai', 'gemini'];

class AIController {
  /**
   * GET /api/ai/settings
   * Returns the user's current AI provider, whether personal keys are configured,
   * and whether server-level default keys are available.
   * Never returns actual keys.
   */
  async getSettings(req, res, next) {
    try {
      const user = await User.findById(req.user._id).select('aiProvider aiApiKey aiKeys');
      if (!user) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      }

      const defaultProvider = (env.OPENAI_API_KEY && env.OPENAI_API_KEY.trim().length > 0)
        ? 'openai'
        : ((env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0) ? 'gemini' : 'openai');

      let currentProvider = user.aiProvider || defaultProvider;
      const hasUserKey = {
        openai: !!(user.aiKeys?.openai || (user.aiProvider === 'openai' && user.aiApiKey)),
        gemini: !!(user.aiKeys?.gemini || (user.aiProvider === 'gemini' && user.aiApiKey))
      };
      const hasServerKey = {
        openai: !!(env.OPENAI_API_KEY && env.OPENAI_API_KEY.trim().length > 0),
        gemini: !!(env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0)
      };

      if (!hasUserKey[currentProvider] && !hasServerKey[currentProvider] && hasServerKey[defaultProvider]) {
        currentProvider = defaultProvider;
      }

      const currentHasUserKey = !!hasUserKey[currentProvider];
      const currentServerKeyAvailable = !!hasServerKey[currentProvider];

      res.status(200).json({
        success: true,
        data: {
          aiProvider: currentProvider,
          hasApiKey: currentHasUserKey,
          hasUserKey,
          hasServerKey,
          serverKeyAvailable: currentServerKeyAvailable,
          keyRequired: !currentHasUserKey && !currentServerKeyAvailable
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/ai/settings
   * Body: { provider: 'openai' | 'gemini', apiKey?: string }
   */
  async updateSettings(req, res, next) {
    try {
      const { provider, apiKey } = req.body;

      if (!provider || !SUPPORTED_PROVIDERS.includes(provider)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `provider must be one of: ${SUPPORTED_PROVIDERS.join(', ')}`
          }
        });
      }

      if (apiKey !== undefined && apiKey !== null) {
        if (typeof apiKey !== 'string' || (apiKey.trim() && apiKey.trim().length < 10)) {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'apiKey must be a valid key string (at least 10 characters)' }
          });
        }
      }

      const user = await User.findById(req.user._id).select('aiProvider aiApiKey aiKeys');
      if (!user) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      }

      const serverKey = provider === 'gemini' ? env.GEMINI_API_KEY : env.OPENAI_API_KEY;
      const existingUserKey = user.aiKeys?.[provider] || (user.aiProvider === provider ? user.aiApiKey : null);
      const trimmedApiKey = typeof apiKey === 'string' ? apiKey.trim() : '';

      // If user wants to clear key
      const wantsToClear = apiKey === '' || apiKey === null;
      if (wantsToClear) {
        if (!serverKey) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: `Cannot remove API key because no server default key is configured for ${provider}`
            }
          });
        }
        user.aiKeys = user.aiKeys || {};
        user.aiKeys[provider] = null;
        if (user.aiProvider === provider) {
          user.aiApiKey = null;
        }
      } else if (trimmedApiKey) {
        // User provided a custom key
        user.aiKeys = user.aiKeys || {};
        user.aiKeys[provider] = trimmedApiKey;
        user.aiApiKey = trimmedApiKey;
      } else if (!existingUserKey && !serverKey) {
        // No key provided, no existing user key, and no server fallback
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `An API key is required for ${provider} as no server default key is configured`
          }
        });
      } else {
        // Keeping existing user key or using server key
        if (user.aiKeys?.[provider]) {
          user.aiApiKey = user.aiKeys[provider];
        } else if (!serverKey && user.aiApiKey && user.aiProvider === provider) {
          // Keep current aiApiKey
        } else if (!user.aiKeys?.[provider]) {
          user.aiApiKey = null;
        }
      }

      user.aiProvider = provider;
      await user.save();

      const hasUserKey = {
        openai: !!(user.aiKeys?.openai || (user.aiProvider === 'openai' && user.aiApiKey)),
        gemini: !!(user.aiKeys?.gemini || (user.aiProvider === 'gemini' && user.aiApiKey))
      };
      const hasServerKey = {
        openai: !!env.OPENAI_API_KEY,
        gemini: !!env.GEMINI_API_KEY
      };

      res.status(200).json({
        success: true,
        data: {
          message: `AI provider updated to ${provider} successfully`,
          aiProvider: provider,
          hasApiKey: !!hasUserKey[provider],
          hasUserKey,
          hasServerKey,
          serverKeyAvailable: !!hasServerKey[provider]
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AIController();
