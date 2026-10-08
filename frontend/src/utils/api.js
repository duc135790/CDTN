import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      if (!url.includes('/login') && !url.includes('/register')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/customers/login', credentials),
  register: (userData) => api.post('/customers', userData),
  getProfile: () => api.get('/customers/profile', { params: { _t: Date.now() } }),
};

export const productsAPI = {
  getProducts: (keyword = '', category = '') => api.get('/products', { 
    params: { keyword, category, _t: Date.now() } 
  }),
  
  getProductById: (id) => api.get(`/products/${id}`, { params: { _t: Date.now() } }),
  
  getAllProducts: () => api.get('/products/admin/all', { params: { _t: Date.now() } }),
  createProduct: (productData) => api.post('/products', productData),
  updateProduct: (id, productData) => api.put(`/products/${id}`, productData),
  deleteProduct: (id) => api.delete(`/products/${id}`),
  updateStock: (id, countInStock) => api.put(`/products/${id}/stock`, { countInStock }),
  toggleVisibility: (id) => api.put(`/products/${id}/toggle-visibility`),
  getBestSelling: () => api.get('/products/stats/best-selling'),
};

export const ordersAPI = {
  createOrder: (orderData) => api.post('/orders', orderData),
  getMyOrders: () => api.get('/orders/myorders', { params: { _t: Date.now() } }),
  
  getOrderById: (id) => api.get(`/orders/${id}`, { params: { _t: Date.now() } }),
  getAllOrders: (searchTerm = '') => api.get('/orders', { params: { search: searchTerm, _t: Date.now() } }),
  updateStatus: (id, orderStatus) => api.put(`/orders/${id}/status`, { orderStatus }),
  updateOrderToDelivered: (id) => api.put(`/orders/${id}/deliver`),
  updatePaymentStatus: (id, isPaid) => api.put(`/orders/${id}/payment`, { isPaid }),
  
  // ✅ FIXED: Đổi từ DELETE thành PUT để gọi đúng route cancel
  cancelOrder: (id) => api.put(`/orders/${id}/cancel`),
  
  // Stats
  getRevenueStats: (period = 'month') => api.get('/orders/stats/revenue', { params: { period } }),
  getTopCustomers: () => api.get('/orders/stats/top-customers'),
  getOverview: () => api.get('/orders/stats/overview'),
};

export const cartAPI = {
  getCart: () => api.get('/customers/cart', { params: { _t: Date.now() } }),
  
  addToCart: (productId, quantity) => api.post('/customers/cart', { productId, quantity }),
  updateCartItem: (productId, quantity) => api.put('/customers/cart', { productId, quantity }),
  removeFromCart: (productId) => api.delete(`/customers/cart/${productId}`),
};

export const vouchersAPI = {
  getActiveVouchers: () => api.get('/vouchers', { params: { _t: Date.now() } }),
  applyVoucher: (code, orderTotal) => api.post('/vouchers/apply', { code, orderTotal }),
  getAllVouchersAdmin: () => api.get('/vouchers/admin/all', { params: { _t: Date.now() } }),
  createVoucher: (voucherData) => api.post('/vouchers/create', voucherData),
  updateVoucher: (id, voucherData) => api.put(`/vouchers/${id}`, voucherData),
  deleteVoucher: (id) => api.delete(`/vouchers/${id}`),
  useVoucher: (id) => api.put(`/vouchers/${id}/use`),
  toggleVoucher: (id) => api.put(`/vouchers/${id}/toggle-visibility`)
};

export const customersAPI = {
  getAllCustomers: () => api.get('/customers/all', { params: { _t: Date.now() } }),
  toggleAdmin: (id) => api.put(`/customers/${id}/toggle-admin`),
  toggleActive: (id) => api.put(`/customers/${id}/toggle-active`),
  updateProfile: (data) => api.put('/customers/profile', data),
  updateCustomerByAdmin: (id, data) => api.put(`/customers/${id}/update-info`, data)
};

export default api;