import axios from 'axios';
import API_BASE_URL from '../config/apiConfig';
import { isAuthenticated, redirectToLogin } from '../utils/auth.js';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // Any user-triggered API call re-checks the main-app session cookie, so a
    // logout elsewhere is caught the moment the user does something here
    // instead of only on the next page reload.
    // if (!isAuthenticated()) {
    //   redirectToLogin();
    //   return Promise.reject(new axios.Cancel('Session expired, redirecting to login'));
    // }

    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const userEmail = localStorage.getItem('userEmail') || 'system@forgesphere.probestack.io';
    if (userEmail) {
      config.headers['X-User-Email'] = userEmail;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          console.error('Unauthorized access');
          break;
        case 403:
          console.error('Forbidden access');
          break;
        case 404:
          console.error('Resource not found');
          break;
        case 500:
          console.error('Server error');
          break;
        default:
          console.error('API error:', data?.message || 'Unknown error');
      }
    } else if (error.request) {
      console.error('No response from server');
    } else {
      console.error('Request setup error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;
