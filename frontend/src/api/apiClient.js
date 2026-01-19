import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const client = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('resumakr_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('resumakr_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const api = {
  auth: {
    async register(email, password, full_name) {
      const { data } = await client.post('/auth/register', { email, password, full_name });
      if (data.token) localStorage.setItem('resumakr_token', data.token);
      return data;
    },
    async login(email, password) {
      const { data } = await client.post('/auth/login', { email, password });
      if (data.token) localStorage.setItem('resumakr_token', data.token);
      return data;
    },
    async me() {
      const { data } = await client.get('/auth/me');
      return data;
    },
    async updateMe(updates) {
      const { data } = await client.put('/auth/me', updates);
      return data;
    },
    async isAuthenticated() {
      try {
        await client.get('/auth/check');
        return true;
      } catch {
        return false;
      }
    },
    logout() {
      localStorage.removeItem('resumakr_token');
      window.location.href = '/login';
    },
    async forgotPassword(email) {
      const { data } = await client.post('/auth/forgot-password', { email });
      return data;
    },
    async verifyResetToken(token) {
      const { data } = await client.get(`/auth/verify-reset-token/${token}`);
      return data;
    },
    async resetPassword(token, new_password) {
      const { data } = await client.post('/auth/reset-password', { token, new_password });
      return data;
    }
  },
  entities: {
    Resume: {
      async list(sortBy = '-created_at', limit = 100) {
        const { data } = await client.get('/resumes', { params: { sort: sortBy, limit } });
        return data;
      },
      async filter(filters, sortBy = '-created_at', limit = 100) {
        const { data } = await client.get('/resumes', { params: { ...filters, sort: sortBy, limit } });
        return data;
      },
      async get(id) {
        const { data } = await client.get(`/resumes/${id}`);
        return data;
      },
      async create(resumeData) {
        const { data } = await client.post('/resumes', resumeData);
        return data;
      },
      async update(id, updates) {
        const { data } = await client.put(`/resumes/${id}`, updates);
        return data;
      },
      async delete(id) {
        await client.delete(`/resumes/${id}`);
      }
    },
    ResumeData: {
      async getByResumeId(resumeId) {
        const { data } = await client.get(`/resume-data/by-resume/${resumeId}`);
        return data;
      },
      async create(resumeData) {
        const { data } = await client.post('/resume-data', resumeData);
        return data;
      },
      async update(id, updates) {
        const { data } = await client.put(`/resume-data/${id}`, updates);
        return data;
      }
    },
    ResumeVersion: {
      async filter(filters, sortBy = '-created_at') {
        const { data } = await client.get('/versions', { params: { ...filters, sort: sortBy } });
        return data;
      },
      async create(versionData) {
        const { data } = await client.post('/versions', versionData);
        return data;
      },
      async update(id, updates) {
        const { data } = await client.put(`/versions/${id}`, updates);
        return data;
      },
      async delete(id) {
        await client.delete(`/versions/${id}`);
      }
    },
    SubscriptionPlan: {
      async list() {
        const { data } = await client.get('/subscriptions/plans');
        return data;
      },
      async filter(filters, sortBy = 'price') {
        const { data } = await client.get('/subscriptions/plans', { params: { ...filters, sort: sortBy } });
        return data;
      },
      async get(id) {
        const { data } = await client.get(`/subscriptions/plans/${id}`);
        return data;
      },
      async create(planData) {
        const { data } = await client.post('/subscriptions/plans', planData);
        return data;
      },
      async update(id, updates) {
        const { data } = await client.put(`/subscriptions/plans/${id}`, updates);
        return data;
      },
      async delete(id) {
        await client.delete(`/subscriptions/plans/${id}`);
      },
      async syncStripe(id) {
        const { data } = await client.post(`/subscriptions/plans/${id}/sync-stripe`);
        return data;
      }
    },
    AIProvider: {
      async list() {
        const { data } = await client.get('/providers');
        return data;
      },
      async filter(filters) {
        const { data } = await client.get('/providers', { params: filters });
        return data;
      },
      async create(providerData) {
        const { data } = await client.post('/providers', providerData);
        return data;
      },
      async update(id, updates) {
        const { data } = await client.put(`/providers/${id}`, updates);
        return data;
      },
      async delete(id) {
        await client.delete(`/providers/${id}`);
      },
      async test(providerData) {
        const { data } = await client.post('/providers/test', providerData);
        return data;
      }
    },
    CustomPrompt: {
      async list() {
        const { data } = await client.get('/prompts');
        return data;
      },
      async filter(filters) {
        const { data } = await client.get('/prompts', { params: filters });
        return data;
      },
      async create(promptData) {
        const { data } = await client.post('/prompts', promptData);
        return data;
      },
      async update(id, updates) {
        const { data } = await client.put(`/prompts/${id}`, updates);
        return data;
      },
      async delete(id) {
        await client.delete(`/prompts/${id}`);
      }
    },
    CouponCode: {
      async list() {
        const { data } = await client.get('/coupons');
        return data;
      },
      async filter(filters) {
        const { data } = await client.get('/coupons', { params: filters });
        return data;
      },
      async get(id) {
        const { data } = await client.get(`/coupons/${id}`);
        return data;
      },
      async create(couponData) {
        const { data } = await client.post('/coupons', couponData);
        return data;
      },
      async update(id, updates) {
        const { data } = await client.put(`/coupons/${id}`, updates);
        return data;
      },
      async delete(id) {
        await client.delete(`/coupons/${id}`);
      }
    },
    FAQItem: {
      async list() {
        const { data } = await client.get('/faq');
        return data;
      },
      async filter(filters, sortBy = 'order_index') {
        const { data } = await client.get('/faq', { params: { ...filters, sort: sortBy } });
        return data;
      }
    },
    HelpConfig: {
      async list() {
        const { data } = await client.get('/faq/config');
        return [data];
      }
    },
    AppSettings: {
      async list() {
        const { data } = await client.get('/settings');
        return data;
      },
      async get(key) {
        const { data } = await client.get(`/settings/${key}`);
        return data;
      },
      async update(key, updates) {
        const { data } = await client.put(`/settings/${key}`, updates);
        return data;
      }
    },
    Users: {
      async list(params) {
        const { data } = await client.get('/users', { params });
        return data;
      },
      async get(id) {
        const { data } = await client.get(`/users/${id}`);
        return data;
      },
      async create(userData) {
        const { data } = await client.post('/users', userData);
        return data;
      },
      async update(id, updates) {
        const { data } = await client.put(`/users/${id}`, updates);
        return data;
      },
      async delete(id) {
        await client.delete(`/users/${id}`);
      }
    }
  },
  integrations: {
    Core: {
      async InvokeLLM(params) {
        const { data } = await client.post('/ai/invoke', params);
        return data;
      },
      async UploadFile(fileData) {
        const formData = new FormData();
        formData.append('file', fileData.file);
        const { data } = await client.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        return data;
      },
      async ExtractDataFromUploadedFile(params) {
        const { data } = await client.post('/upload/extract', params);
        return data;
      },
      async analyzeATS(jobDescription, resumeData) {
        const { data } = await client.post('/ai/analyze-ats', {
          job_description: jobDescription,
          resume_data: resumeData
        });
        return data;
      }
    }
  },
  functions: {
    async validateCoupon(coupon_code, plan_id) {
      const { data } = await client.post('/coupons/validate', { coupon_code, plan_id });
      return data;
    },
    async applyCoupon(coupon_code) {
      const { data } = await client.post('/coupons/apply', { coupon_code });
      return data;
    },
    async invoke(functionName, params) {
      const { data } = await client.post(`/ai/${functionName}`, params);
      return data;
    }
  }
};

export default api;
