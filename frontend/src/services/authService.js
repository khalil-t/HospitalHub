import { auditService } from './auditService.js';

const API_URL = import.meta.env.VITE_API_URL;

export const authService = {
  async login(email, password) {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    localStorage.setItem('user', JSON.stringify(data.user));

    if (!response.ok) {
      const error = await response.json();
      await auditService.logAction(
        'FAILED_LOGIN',
        'authentication',
        null,
        `Failed login attempt for ${email}: ${error.message}`,
      );
      throw new Error(error.message || 'Login failed');
    }
    return data;
  },

  async register(userData) {
    const response = await fetch(`${API_URL}/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: userData.email.split('@')[0],
        email: userData.email,
        password: userData.password,
        fullName: userData.fullName || 'New User',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      await auditService.logAction(
        'USER_CREATED',
        'user',
        null,
        `Failed registration for ${userData.email}: ${error.message}`,
      );
      throw new Error(error.message || 'Registration failed');
    }
    return await response.json();
  },

  async checkIfAdminExists() {
    try {
      const response = await fetch(`${API_URL}/users/admin-exists`);

      if (!response.ok) {
        throw new Error('Failed to check admin status');
      }

      const data = await response.json();
      return data.exists;
    } catch {
      return false;
    }
  },

  async logout() {
    const user = this.getCurrentUser();
    const token = localStorage.getItem('access_token');

    const request = async () => {
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
      if (user) {
        await auditService.logAction(
          'LOGOUT',
          'authentication',
          user.id,
          `User logged out: ${user.email}`,
        );
      }
    };

    await request().catch(() => null);

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },

  getCurrentUser() {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  getToken() {
    return localStorage.getItem('access_token');
  },

  isAuthenticated() {
    const token = this.getToken();
    const user = this.getCurrentUser();
    return !!(token && user);
  },

  async refreshToken() {
    const user = this.getCurrentUser();
    try {
      const refreshToken = localStorage.getItem('refresh_token');

      if (!refreshToken || !user) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          refreshToken: refreshToken,
        }),
      });

      const data = await response.json();

      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      if (!response.ok) {
        await auditService.logAction(
          'TOKEN_REFRESH_FAILED',
          'authentication',
          user.id,
          'Token refresh failed - logging out user',
        );
        throw new Error('Token refresh failed');
      }
      return data;
    } catch (error) {
      this.logout();
      throw error;
    }
  },
};
