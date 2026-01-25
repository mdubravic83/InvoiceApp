import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('finzen_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('finzen_token');
            localStorage.removeItem('finzen_user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth
export const authApi = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    getMe: () => api.get('/auth/me'),
};

// Settings
export const settingsApi = {
    saveZoho: (data) => api.post('/settings/zoho', data),
    getZoho: () => api.get('/settings/zoho'),
};

// Vendors
export const vendorApi = {
    create: (data) => api.post('/vendors', data),
    getAll: () => api.get('/vendors'),
    update: (id, data) => api.put(`/vendors/${id}`, data),
    delete: (id) => api.delete(`/vendors/${id}`),
};

// Transactions
export const transactionApi = {
    uploadCSV: (file, month, year) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post(`/upload/csv?month=${month}&year=${year}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
    getBatches: () => api.get('/batches'),
    getAll: (batchId, status) => {
        const params = new URLSearchParams();
        if (batchId) params.append('batch_id', batchId);
        if (status) params.append('status', status);
        return api.get(`/transactions?${params.toString()}`);
    },
    update: (id, data) => api.put(`/transactions/${id}`, data),
    exportCSV: (batchId) => api.get(`/export/csv/${batchId}`, { responseType: 'blob' }),
};

// Stats
export const statsApi = {
    get: () => api.get('/stats'),
};

// Email
export const emailApi = {
    search: (vendorName, dateFrom, dateTo) => 
        api.post(`/email/search?vendor_name=${encodeURIComponent(vendorName)}${dateFrom ? `&date_from=${dateFrom}` : ''}${dateTo ? `&date_to=${dateTo}` : ''}`),
};

export default api;
