import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
});

// Attach JWT token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rag_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear token and redirect to login
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('rag_token');
      localStorage.removeItem('rag_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  profile: () => api.get('/auth/me'),
};

// ─── Documents ───────────────────────────────────────────────────────────────
export const documentsApi = {
  upload: (formData, onProgress) =>
    api.post('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    }),
  list: () => api.get('/documents'),
  getById: (id) => api.get(`/documents/${id}`),
  delete: (id) => api.delete(`/documents/${id}`),
};

// ─── Chat ─────────────────────────────────────────────────────────────────────
export const chatApi = {
  send: (data) => api.post('/chat', data),
};

// ─── AI Settings ──────────────────────────────────────────────────────────────
export const aiApi = {
  getSettings: () => api.get('/ai/settings'),
  updateSettings: (data) => api.put('/ai/settings', data),
};

// ─── Conversations ────────────────────────────────────────────────────────────
export const conversationsApi = {
  list: () => api.get('/conversations'),
  getMessages: (id) => api.get(`/conversations/${id}/messages`),
  delete: (id) => api.delete(`/conversations/${id}`),
};

// ─── Health ───────────────────────────────────────────────────────────────────
export const healthApi = {
  check: () => api.get('/health'),
};

export default api;
