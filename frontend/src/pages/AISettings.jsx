import { useEffect, useState } from 'react';
import { Check, KeyRound, LoaderCircle, Undo2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { aiApi } from '../lib/api';

const providers = [
  { id: 'openai', label: 'OpenAI' },
  { id: 'gemini', label: 'Gemini' },
];

export default function AISettings() {
  const [provider, setProvider] = useState('openai');
  const [savedProvider, setSavedProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [hasUserKey, setHasUserKey] = useState({ openai: false, gemini: false });
  const [hasServerKey, setHasServerKey] = useState({ openai: false, gemini: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    aiApi.getSettings()
      .then(({ data }) => {
        const settings = data.data;
        const currentProvider = settings.aiProvider || 'openai';
        setProvider(currentProvider);
        setSavedProvider(currentProvider);
        setHasUserKey(settings.hasUserKey || {
          openai: currentProvider === 'openai' ? !!settings.hasApiKey : false,
          gemini: currentProvider === 'gemini' ? !!settings.hasApiKey : false
        });
        setHasServerKey(settings.hasServerKey || { openai: true, gemini: false });
      })
      .catch(() => toast.error('Could not load AI settings'))
      .finally(() => setLoading(false));
  }, []);

  const isUserKeyConfigured = !!hasUserKey[provider];
  const isServerKeyAvailable = !!hasServerKey[provider];
  const isKeyRequired = !isUserKeyConfigured && !isServerKeyAvailable;

  const saveSettings = async (event) => {
    event.preventDefault();
    if (isKeyRequired && !apiKey.trim()) {
      toast.error(`Enter your ${provider === 'gemini' ? 'Gemini' : 'OpenAI'} API key (no server default key configured)`);
      return;
    }

    setSaving(true);
    try {
      const payload = { provider };
      if (apiKey.trim()) {
        payload.apiKey = apiKey.trim();
      }
      const { data } = await aiApi.updateSettings(payload);
      setSavedProvider(data.data.aiProvider);
      if (data.data.hasUserKey) {
        setHasUserKey(data.data.hasUserKey);
      } else {
        setHasUserKey((prev) => ({ ...prev, [data.data.aiProvider]: data.data.hasApiKey }));
      }
      if (data.data.hasServerKey) {
        setHasServerKey(data.data.hasServerKey);
      }
      setApiKey('');
      toast.success('AI settings saved successfully');
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Could not save AI settings');
    } finally {
      setSaving(false);
    }
  };

  const handleClearCustomKey = async () => {
    if (!isServerKeyAvailable) {
      toast.error('Cannot clear key: no server default key configured for this provider');
      return;
    }
    setSaving(true);
    try {
      const { data } = await aiApi.updateSettings({ provider, apiKey: '' });
      setSavedProvider(data.data.aiProvider);
      if (data.data.hasUserKey) {
        setHasUserKey(data.data.hasUserKey);
      } else {
        setHasUserKey((prev) => ({ ...prev, [data.data.aiProvider]: false }));
      }
      setApiKey('');
      toast.success(`Custom key removed. Now using server default ${provider === 'gemini' ? 'Gemini' : 'OpenAI'} key.`);
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to clear custom key');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>AI provider</h2>
          <p>Choose the model provider used to generate answers</p>
        </div>
      </div>
      <div className="page-body ai-settings-page">
        {loading ? (
          <div className="ai-settings-loading"><LoaderCircle className="spin" size={24} /></div>
        ) : (
          <form className="ai-settings-form" onSubmit={saveSettings}>
            <div className="ai-provider-options" role="radiogroup" aria-label="AI provider">
              {providers.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={provider === option.id}
                  className={`ai-provider-option${provider === option.id ? ' selected' : ''}`}
                  onClick={() => setProvider(option.id)}
                >
                  <span>{option.label}</span>
                  {provider === option.id && <Check size={16} />}
                </button>
              ))}
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <label htmlFor="ai-api-key" style={{ margin: 0 }}>
                  {provider === 'gemini' ? 'Gemini' : 'OpenAI'} API Key
                </label>
                {isServerKeyAvailable && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--accent)', background: 'var(--accent-soft)', padding: '2px 8px', borderRadius: '99px' }}>
                    Server default available (Key is optional)
                  </span>
                )}
              </div>
              <div className="ai-key-input-wrap">
                <KeyRound size={17} aria-hidden="true" />
                <input
                  id="ai-api-key"
                  className="form-control"
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder={
                    isUserKeyConfigured
                      ? 'Custom key saved (enter a new key to update)'
                      : isServerKeyAvailable
                      ? 'Optional: enter key to override server default'
                      : 'Enter API key (required)'
                  }
                  autoComplete="new-password"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '0.45rem', gap: '0.5rem' }}>
                <p className="ai-settings-hint" style={{ margin: 0, flex: 1 }}>
                  {isUserKeyConfigured ? (
                    'Your custom personal key is active. Enter a new key to replace it, or reset to server default.'
                  ) : isServerKeyAvailable ? (
                    'The server has a default API key configured in .env. Entering your own key is optional and overrides the server key.'
                  ) : (
                    'No server default key is configured. You must provide an API key to use this provider.'
                  )}
                </p>
                {isUserKeyConfigured && isServerKeyAvailable && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={handleClearCustomKey}
                    disabled={saving}
                    title="Remove custom key and fall back to server default"
                  >
                    <Undo2 size={13} />
                    Use server default
                  </button>
                )}
              </div>
            </div>

            <div className="ai-settings-note">
              Document embeddings continue to use the server-configured OpenAI embedding model so they remain compatible with your existing vector index.
            </div>

            <div className="ai-settings-actions">
              <span
                className={`ai-key-status${
                  isUserKeyConfigured
                    ? ' configured'
                    : isServerKeyAvailable
                    ? ' server-default'
                    : ''
                }`}
              >
                {isUserKeyConfigured
                  ? 'Custom personal key active'
                  : isServerKeyAvailable
                  ? 'Server default key active (Optional)'
                  : 'Key required'}
              </span>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}
                Save settings
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}