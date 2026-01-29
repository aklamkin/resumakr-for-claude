import axios from 'axios';

const API_BASE = '/api/admin';

const client = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

// Inject admin token
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('resumakr_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 → redirect to login
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('resumakr_admin_token');
      window.location.href = '/config/login';
    }
    return Promise.reject(error);
  }
);

const adminApi = {
  auth: {
    login: (email, password) => client.post('/auth/login', { email, password }),
    me: () => client.get('/auth/me'),
    googleUrl: () => `${API_BASE}/auth/google`,
  },

  adminUsers: {
    list: () => client.get('/admin-users'),
    create: (data) => client.post('/admin-users', data),
    update: (id, data) => client.put(`/admin-users/${id}`, data),
    remove: (id) => client.delete(`/admin-users/${id}`),
  },

  settings: {
    list: () => client.get('/settings'),
    get: (key) => client.get(`/settings/${key}`),
    update: (key, data) => client.put(`/settings/${key}`, data),
  },

  users: {
    list: (params) => client.get('/users', { params }),
    get: (id) => client.get(`/users/${id}`),
    create: (data) => client.post('/users', data),
    update: (id, data) => client.put(`/users/${id}`, data),
    remove: (id) => client.delete(`/users/${id}`),
  },

  providers: {
    list: () => client.get('/providers'),
    create: (data) => client.post('/providers', data),
    update: (id, data) => client.put(`/providers/${id}`, data),
    remove: (id) => client.delete(`/providers/${id}`),
    test: (data) => client.post('/providers/test', data),
  },

  prompts: {
    listSystem: () => client.get('/prompts/system'),
    updateSystem: (type, data) => client.put(`/prompts/system/${type}`, data),
    resetSystem: (type) => client.post(`/prompts/system/${type}/reset`),
    create: (data) => client.post('/prompts', data),
    update: (id, data) => client.put(`/prompts/${id}`, data),
    remove: (id) => client.delete(`/prompts/${id}`),
  },

  plans: {
    list: () => client.get('/plans'),
    create: (data) => client.post('/plans', data),
    update: (id, data) => client.put(`/plans/${id}`, data),
    remove: (id) => client.delete(`/plans/${id}`),
    syncStripe: (id) => client.post(`/plans/${id}/sync-stripe`),
  },

  coupons: {
    list: () => client.get('/coupons'),
    create: (data) => client.post('/coupons', data),
    update: (id, data) => client.put(`/coupons/${id}`, data),
    remove: (id) => client.delete(`/coupons/${id}`),
  },

  faq: {
    list: () => client.get('/faq'),
    create: (data) => client.post('/faq', data),
    update: (id, data) => client.put(`/faq/${id}`, data),
    remove: (id) => client.delete(`/faq/${id}`),
    getConfig: () => client.get('/faq/config'),
    updateConfig: (data) => client.put('/faq/config', data),
  },

  stripeProfiles: {
    list: () => client.get('/stripe-profiles'),
    get: (id) => client.get(`/stripe-profiles/${id}`),
    getActive: () => client.get('/stripe-profiles/active'),
    create: (data) => client.post('/stripe-profiles', data),
    update: (id, data) => client.put(`/stripe-profiles/${id}`, data),
    remove: (id) => client.delete(`/stripe-profiles/${id}`),
    activate: (id) => client.post(`/stripe-profiles/${id}/activate`),
    test: (id) => client.post(`/stripe-profiles/${id}/test`),
    prices: (id) => client.get(`/stripe-profiles/${id}/prices`),
  },
};

export default adminApi;
