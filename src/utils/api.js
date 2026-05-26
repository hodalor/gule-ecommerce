import axios from 'axios';
import Cookies from 'js-cookie';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Important for httpOnly cookies
  timeout: 20000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const config = error.config || {};
    const method = (config.method || 'get').toLowerCase();

    if (!error.response && method === 'get') {
      config.__retryCount = config.__retryCount || 0;

      if (config.__retryCount < 2) {
        config.__retryCount += 1;
        await wait(600 * config.__retryCount);
        return api(config);
      }
    }

    if (error.response?.status === 401) {
      // Token expired or invalid
      Cookies.remove('token');
      window.location.href = '/login?role=buyer';
    }
    return Promise.reject(error);
  }
);

export default api;
