import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  timeout: 20000, // 20s timeout to tolerate Render cold starts while preventing infinite spinners
});

api.interceptors.request.use((config) => {
  // Attach auth token if present
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Attach X-Request-Id for end-to-end trace correlation
  if (config.headers && !config.headers['X-Request-Id']) {
    const traceId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'web-' + Math.random().toString(36).substring(2, 10);
    config.headers['X-Request-Id'] = traceId;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Attach trace correlation ID to error object for debug reporting
    if (error.response?.headers?.['x-request-id']) {
      error.requestId = error.response.headers['x-request-id'];
    }

    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        const hadToken = !!localStorage.getItem('token');
        localStorage.removeItem('token');
        // Only redirect if user had an existing token that expired or is in the /admin area.
        // Preserves unauthenticated guest checkout flow.
        if (hadToken || window.location.pathname.startsWith('/admin')) {
          if (!window.location.pathname.startsWith('/auth/')) {
            window.location.href = '/auth/login';
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Standardized error message extractor for customer-facing UI
 */
export function getApiErrorMessage(error: any, fallback = 'Unable to complete your request. Please try again.'): string {
  if (!error) return fallback;

  if (error.code === 'ECONNABORTED' || (error.message && error.message.toLowerCase().includes('timeout'))) {
    return 'Our servers are taking longer than usual to respond (waking up). Please try again in a moment.';
  }

  if (error.message === 'Network Error' || !error.response) {
    return 'Unable to reach River Mist servers. Please check your internet connection and try again.';
  }

  const resData = error.response?.data;
  if (resData) {
    if (Array.isArray(resData.message) && resData.message.length > 0) {
      return resData.message.join(', ');
    }
    if (typeof resData.message === 'string' && resData.message.trim() !== '') {
      return resData.message;
    }
    if (typeof resData.error === 'string' && resData.error.trim() !== '') {
      return resData.error;
    }
  }

  if (typeof error.message === 'string' && error.message.trim() !== '') {
    return error.message;
  }

  return fallback;
}

export default api;
