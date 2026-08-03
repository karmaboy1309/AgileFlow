import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor ─────────────────────────────────────────────────────
// Automatically attaches the JWT from LocalStorage to every outgoing request.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('agileflow_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ────────────────────────────────────────────────────
// Globally handles 401 Unauthorized responses by clearing the token and
// redirecting the user to the login page.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('agileflow_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth Endpoints ──────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

// ─── Epics Endpoints ─────────────────────────────────────────────────────────
export const epicsAPI = {
  getAll: () => api.get('/epics'),
  getAnalytics: () => api.get('/epics/analytics'),
  exportWorkspace: () => api.get('/epics/export'),
  importWorkspace: (data) => api.post('/epics/import', data),
  create: (data) => api.post('/epics', data),
  getById: (id) => api.get(`/epics/${id}`),
  update: (id, data) => api.put(`/epics/${id}`, data),
  delete: (id) => api.delete(`/epics/${id}`),
};

// ─── Tasks Endpoints ─────────────────────────────────────────────────────────
export const tasksAPI = {
  getByEpic: (epicId) => api.get(`/tasks?epicId=${epicId}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  addComment: (id, text) => api.post(`/tasks/${id}/comments`, { text }),
  deleteComment: (id, commentId) => api.delete(`/tasks/${id}/comments/${commentId}`),
  toggleArchive: (id, isArchived) => api.put(`/tasks/${id}`, { isArchived }),
};

export default api;
