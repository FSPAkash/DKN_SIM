import api from './api';

export const authService = {
  async login(username, password) {
    const response = await api.post('/auth/login', { username, password });
    
    if (response.data.success) {
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
    }
    
    return response.data;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  },

  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  isAuthenticated() {
    return !!localStorage.getItem('access_token');
  },

  getStoredUser() {
    const token = localStorage.getItem('access_token');
    if (!token) return null;

    try {
      // Decode JWT payload (base64)
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('Token payload:', payload); // DEBUG
      return {
        username: payload.sub,
        isAdmin: payload.is_admin || false,
      };
    } catch (err) {
      console.error('Token decode error:', err);
      return null;
    }
  },
};