import { auditService } from './auditService.js';

const API_URL = import.meta.env.VITE_API_URL;

let refreshPromise = null;

const notifyAuthChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth:change'));
  }
};

const normalizeUser = (user) => {
  if (!user) return null;
  const roles = Array.isArray(user.roles)
    ? user.roles.map((r) => (typeof r === 'string' ? r : r.name))
    : [];
  const isExternalDoctor = Boolean(
    user.isExternalDoctor || roles.includes('external_doctor'),
  );

  return {
    ...user,
    roles,
    isExternalDoctor,
  };
};

export const authService = {
  async login(email, password) {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        response.status === 429
          ? 'Too many login attempts. Please try again later.'
          : data.message || 'Invalid email or password';
      await auditService.logAction(
        'FAILED_LOGIN',
        'authentication',
        null,
        `Failed login attempt for ${email}: ${data.message || message}`,
      ).catch(() => {});
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    const normalizedUser = normalizeUser(data.user);

    localStorage.setItem('access_token', data.access_token);
    sessionStorage.setItem('refresh_token', data.refresh_token);
    localStorage.removeItem('refresh_token');
    localStorage.setItem('user', JSON.stringify(normalizedUser));

    notifyAuthChange();

    return {
      ...data,
      user: normalizedUser,
    };
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

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        response.status === 404
          ? 'Registration is closed. Please sign in with the existing administrator account.'
          : data.message || 'Registration failed';
      await auditService.logAction(
        'USER_CREATED',
        'user',
        null,
        `Failed registration for ${userData.email}: ${data.message || message}`,
      ).catch(() => {});
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    return data;
  },

  async checkIfAdminExists() {
    try {
      const response = await fetch(`${API_URL}/users/admin-exists`);
      if (!response.ok) {
        throw new Error('Failed to check admin status');
      }
      const data = await response.json();
      return Boolean(data.exists);
    } catch {
      return false;
    }
  },

  async logout() {
    const user = this.getCurrentUser();
    const token = this.getToken();

    try {
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }).catch(() => null);
      }

      if (user) {
        await auditService.logAction(
          'LOGOUT',
          'authentication',
          user.id,
          `User logged out: ${user.email}`,
        ).catch(() => null);
      }
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('refresh_token');
      localStorage.removeItem('refresh_token');
      notifyAuthChange();
    }
  },

  getCurrentUser() {
    try {
      const user = localStorage.getItem('user');
      return user ? normalizeUser(JSON.parse(user)) : null;
    } catch {
      return null;
    }
  },

  getToken() {
    return localStorage.getItem('access_token');
  },

  getRefreshToken() {
    return (
      sessionStorage.getItem('refresh_token') ||
      localStorage.getItem('refresh_token')
    );
  },

  isAuthenticated() {
    const token = this.getToken();
    const user = this.getCurrentUser();
    return Boolean(token && user);
  },

  async refreshToken() {
    if (refreshPromise) {
      return refreshPromise;
    }

    refreshPromise = (async () => {
      const user = this.getCurrentUser();
      const currentRefreshToken = this.getRefreshToken();

      if (!currentRefreshToken || !user?.id) {
        await this.logout();
        throw new Error('No refresh token or user ID available');
      }

      try {
        const response = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            refreshToken: currentRefreshToken,
          }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          await auditService.logAction(
            'TOKEN_REFRESH_FAILED',
            'authentication',
            user.id,
            'Token refresh failed - logging out user',
          ).catch(() => {});
          await this.logout();
          throw new Error(data.message || 'Token refresh failed');
        }

        const normalizedUser = normalizeUser(data.user);

        localStorage.setItem('access_token', data.access_token);
        sessionStorage.setItem('refresh_token', data.refresh_token);
        localStorage.removeItem('refresh_token');
        localStorage.setItem('user', JSON.stringify(normalizedUser));

        notifyAuthChange();

        return {
          ...data,
          user: normalizedUser,
        };
      } catch (error) {
        await this.logout();
        throw error;
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  },

  async validateSession() {
    const token = this.getToken();
    const refreshToken = this.getRefreshToken();

    if (!token && !refreshToken) {
      return null;
    }

    if (token) {
      try {
        const response = await fetch(`${API_URL}/auth/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const profile = await response.json();
          const normalizedUser = normalizeUser({
            ...profile,
            token,
          });

          localStorage.setItem('user', JSON.stringify(normalizedUser));
          notifyAuthChange();
          return {
            user: normalizedUser,
            token,
          };
        }

        if (response.status !== 401) {
          // Non-401 server error; if we have cached user, return it
          const cachedUser = this.getCurrentUser();
          if (cachedUser) {
            return { user: { ...cachedUser, token }, token };
          }
        }
      } catch {
        // Network failure; fall back to cached user if available
        const cachedUser = this.getCurrentUser();
        if (cachedUser) {
          return { user: { ...cachedUser, token }, token };
        }
      }
    }

    if (refreshToken) {
      try {
        const refreshed = await this.refreshToken();
        return {
          user: refreshed.user,
          token: refreshed.access_token,
        };
      } catch {
        return null;
      }
    }

    await this.logout();
    return null;
  },
};
