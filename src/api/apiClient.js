/**
 * Finflow Central API Client
 */
export const API_BASE = '/api';

export const api = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  let data;
  try {
    data = await response.json();
  } catch (err) {
    data = { message: 'Failed to parse response' };
  }

  if (!response.ok) {
    if (response.status === 401) {
      // Trigger token invalid event so auth context can log out
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

// Typed Endpoint helpers
export const authApi = {
  login: (credentials) => api('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  forgotPassword: (email) => api('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (payload) => api('/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }),
  getMe: () => api('/auth/me'),
};

export const dashboardApi = {
  getSummary: () => api('/dashboard'),
};

export const partiesApi = {
  getAll: () => api('/parties'),
  create: (partyData) => api('/parties', { method: 'POST', body: JSON.stringify(partyData) }),
  update: (id, partyData) => api(`/parties/${id}`, { method: 'PUT', body: JSON.stringify(partyData) }),
  updateStatus: (id, active) => api(`/parties/${id}/status`, { method: 'PATCH', body: JSON.stringify({ active }) }),
};

export const transactionsApi = {
  getAll: () => api('/transactions'),
  create: (formData) => api('/transactions', { method: 'POST', body: formData }),
};

export const usersApi = {
  getAll: () => api('/users'),
  create: (userData) => api('/users', { method: 'POST', body: JSON.stringify(userData) }),
};
