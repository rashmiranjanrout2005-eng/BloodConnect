// Automatically uses the same domain/port where the backend is hosted
const API_BASE = window.location.origin + '/api';

async function apiRequest(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    }
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'The server could not complete the request.');
  return body;
}

const BloodAPI = {
  async register(data) {
    return apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(data) });
  },

  async login(data) {
    return apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(data) });
  },

  async getCurrentUser() {
    return apiRequest('/auth/me');
  },

  async logout() {
    return apiRequest('/auth/logout', { method: 'POST' });
  },

  async getRequests(bloodGroup = 'ALL', city = '') {
    const params = new URLSearchParams({ bloodGroup, city });
    return apiRequest(`/requests?${params}`);
  },

  async createRequest(data) {
    return apiRequest('/requests', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async fulfillRequest(id) {
    return apiRequest(`/requests/${id}/fulfill`, { method: 'PATCH' });
  },

  async getDonors(bloodGroup = 'ALL', city = '', available = true) {
    const params = new URLSearchParams({ bloodGroup, city, available });
    return apiRequest(`/donors?${params}`);
  },

  async registerDonor(data) {
    return apiRequest('/donors', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async toggleDonorAvailability(id) {
    return apiRequest(`/donors/${id}/toggle`, { method: 'PATCH' });
  }
};
