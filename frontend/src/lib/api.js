import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor ──────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  // Attach JWT token from localStorage if present
  const token = localStorage.getItem('rfx_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Attach session ID for guest cart
  const sessionId = getOrCreateSessionId();
  config.headers['x-session-id'] = sessionId;

  return config;
});

// ─── Response Interceptor ─────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED') {
      // Clear stale token and redirect to login
      localStorage.removeItem('rfx_token');
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    return Promise.reject(error);
  }
);

// ─── Session ID for Guest Cart ─────────────────────────────────────────────────
export function getOrCreateSessionId() {
  let sessionId = localStorage.getItem('rfx_session_id');
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('rfx_session_id', sessionId);
  }
  return sessionId;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authApi = {
  signup: (data) => api.post('/auth/signup', { ...data, sessionId: getOrCreateSessionId() }),
  login: (data) => api.post('/auth/login', { ...data, sessionId: getOrCreateSessionId() }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  resendVerification: () => api.post('/auth/resend-verification'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  updateProfile: (data) => api.patch('/auth/profile', data),
  changePassword: (data) => api.post('/auth/change-password', data),
};

// ─── Products API ─────────────────────────────────────────────────────────────
export const productsApi = {
  list: (params) => api.get('/products', { params }),
  featured: () => api.get('/products/featured'),
  filters: () => api.get('/products/filters'),
  getBySlug: (slug) => api.get(`/products/${slug}`),
};

// ─── Cart API ─────────────────────────────────────────────────────────────────
export const cartApi = {
  get: () => api.get('/cart'),
  add: (slug, qty) => api.post('/cart/add', { slug, qty }),
  update: (slug, qty) => api.patch('/cart/update', { slug, qty }),
  remove: (slug) => api.delete(`/cart/remove/${slug}`),
  clear: () => api.delete('/cart/clear'),
};

// ─── Orders API ───────────────────────────────────────────────────────────────
export const ordersApi = {
  list: (params) => api.get('/orders', { params }),
  getByNumber: (orderNumber, email) =>
    api.get(`/orders/${orderNumber}`, { params: email ? { email } : {} }),
  create: (data) => api.post('/orders/create', data),
};

// ─── Stripe API ───────────────────────────────────────────────────────────────
export const stripeApi = {
  createPaymentIntent: (data) => api.post('/stripe/create-payment-intent', data),
};

// ─── Admin API ────────────────────────────────────────────────────────────────
export const adminApi = {
  stats: () => api.get('/admin/stats'),

  // Products
  listProducts: (params) => api.get('/admin/products', { params }),
  getProduct: (id) => api.get(`/admin/products/${id}`),
  createProduct: (data) => api.post('/admin/products', data),
  updateProduct: (id, data) => api.patch(`/admin/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/admin/products/${id}`),
  updateStock: (id, stockQuantity) => api.patch(`/admin/products/${id}/stock`, { stockQuantity }),

  // Orders
  listOrders: (params) => api.get('/admin/orders', { params }),
  getOrder: (id) => api.get(`/admin/orders/${id}`),
  updateOrderStatus: (id, data) => api.patch(`/admin/orders/${id}/status`, data),

  // Users
  listUsers: (params) => api.get('/admin/users', { params }),
  updateUser: (id, data) => api.patch(`/admin/users/${id}`, data),
  getUserOrders: (id) => api.get(`/admin/users/${id}/orders`),

  // Upload
  uploadImages: (formData) =>
    api.post('/upload/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteImage: (publicId) =>
    api.delete(`/upload/products/${encodeURIComponent(publicId)}`),
};

export default api;
