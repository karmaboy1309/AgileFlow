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
  changePassword: (data) => api.put('/auth/password', data),
};

// ─── Epics Endpoints ────────────────────────────────────────────────
export const epicsAPI = {
  getAll: (status) => api.get(status ? `/epics?status=${status}` : '/epics'),
  getAnalytics: () => api.get('/epics/analytics'),
  exportWorkspace: () => api.get('/epics/export'),
  importWorkspace: (data) => api.post('/epics/import', data),
  create: (data) => api.post('/epics', data),
  getById: (id) => api.get(`/epics/${id}`),
  update: (id, data) => api.put(`/epics/${id}`, data),
  delete: (id) => api.delete(`/epics/${id}`),
  duplicate: (id) => api.post(`/epics/${id}/duplicate`),
};

// ─── Tasks Endpoints ─────────────────────────────────────────────────────────
export const tasksAPI = {
  getByEpic: (epicId, params = {}) => api.get(`/tasks?epicId=${epicId}`, { params }),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  addComment: (id, text) => api.post(`/tasks/${id}/comments`, { text }),
  deleteComment: (id, commentId) => api.delete(`/tasks/${id}/comments/${commentId}`),
  toggleArchive: (id, isArchived) => api.put(`/tasks/${id}`, { isArchived }),
  bulkUpdate: (taskIds, updates) => api.post('/tasks/bulk-update', { taskIds, updates }),
  bulkDelete: (taskIds) => api.post('/tasks/bulk-delete', { taskIds }),
  logWork: (id, data) => api.post(`/tasks/${id}/worklog`, data),
  deleteWorkLog: (id, logId) => api.delete(`/tasks/${id}/worklog/${logId}`),
  exportTasks: (params) => api.get('/tasks/export', { params, responseType: params?.format === 'csv' ? 'blob' : 'json' }),
  importTasks: (data) => api.post('/tasks/import', data),
};

export const projectsAPI = {
  getAll: () => api.get('/projects'),
  create: (data) => api.post('/projects', data),
  getById: (id) => api.get(`/projects/${id}`),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
};

export const sprintsAPI = {
  getAll: (projectId) => api.get(projectId ? `/sprints?projectId=${projectId}` : '/sprints'),
  create: (data) => api.post('/sprints', data),
  update: (id, data) => api.put(`/sprints/${id}`, data),
  start: (id, data) => api.post(`/sprints/${id}/start`, data),
  complete: (id) => api.post(`/sprints/${id}/complete`),
  delete: (id) => api.delete(`/sprints/${id}`),
};

export const releasesAPI = {
  getAll: (projectId) => api.get(projectId ? `/releases?projectId=${projectId}` : '/releases'),
  create: (data) => api.post('/releases', data),
  update: (id, data) => api.put(`/releases/${id}`, data),
  markReleased: (id) => api.post(`/releases/${id}/release`),
  delete: (id) => api.delete(`/releases/${id}`),
};

export const versionsAPI = {
  getAll: (projectId) => api.get(projectId ? `/versions?projectId=${projectId}` : '/versions'),
  create: (data) => api.post('/versions', data),
  update: (id, data) => api.put(`/versions/${id}`, data),
  release: (id) => api.post(`/versions/${id}/release`),
  delete: (id) => api.delete(`/versions/${id}`),
};

export const componentsAPI = {
  getAll: (projectId) => api.get(projectId ? `/components?projectId=${projectId}` : '/components'),
  create: (data) => api.post('/components', data),
  update: (id, data) => api.put(`/components/${id}`, data),
  delete: (id) => api.delete(`/components/${id}`),
};

export const jqlAPI = {
  search: (jql, limit = 50, skip = 0) => api.post('/jql/search', { jql, limit, skip }),
};

export const filtersAPI = {
  getAll: () => api.get('/filters'),
  create: (data) => api.post('/filters', data),
  update: (id, data) => api.put(`/filters/${id}`, data),
  delete: (id) => api.delete(`/filters/${id}`),
};

export const reportsAPI = {
  getBurndown: (sprintId) => api.get(`/reports/burndown?sprintId=${sprintId}`),
  getVelocity: (projectId) => api.get(projectId ? `/reports/velocity?projectId=${projectId}` : '/reports/velocity'),
  getCFD: (projectId, days = 14) => api.get(`/reports/cfd?days=${days}${projectId ? `&projectId=${projectId}` : ''}`),
};

export const worklogsAPI = {
  getByTask: (taskId) => api.get(`/tasks/${taskId}/worklogs`),
  create: (taskId, data) => api.post(`/tasks/${taskId}/worklogs`, data),
  delete: (id) => api.delete(`/worklogs/${id}`),
};

export const linksAPI = {
  getByTask: (taskId) => api.get(`/tasks/${taskId}/links`),
  create: (data) => api.post('/links', data),
  delete: (id) => api.delete(`/links/${id}`),
};

export const rolesAPI = {
  getByProject: (projectId) => api.get(`/projects/${projectId}/roles`),
  assign: (projectId, data) => api.post(`/projects/${projectId}/roles`, data),
  remove: (projectId, userId) => api.delete(`/projects/${projectId}/roles/${userId}`),
};

export const usersAPI = {
  getAll: (query) => api.get(query ? `/users?query=${encodeURIComponent(query)}` : '/users'),
};

export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markAllRead: () => api.put('/notifications/read-all'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  delete: (id) => api.delete(`/notifications/${id}`),
};

export const gadgetsAPI = {
  getAll: () => api.get('/gadgets'),
  create: (data) => api.post('/gadgets', data),
  update: (id, data) => api.put(`/gadgets/${id}`, data),
  delete: (id) => api.delete(`/gadgets/${id}`),
};

export default api;
