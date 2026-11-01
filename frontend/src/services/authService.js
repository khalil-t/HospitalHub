import { auditService } from './auditService.js';
import { USER_ROLE } from '@/lib/roles';
import { authStorage } from '@/lib/authStorage';

const API_URL = import.meta.env.VITE_API_URL;

let refreshPromise = null;
let sessionVersion = 0;

const notifyAuthChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth:change'));
  }
};

const normalizeUser = (user) => {
  if (!user) return null;
  const roles = Array.isArray(user.roles)
    ? user.roles.map((r) => (typeof r === 'string' ? r : r.name)).filter(Boolean)
    : [];
  const isExternalDoctor = Boolean(
    user.isExternalDoctor || roles.includes(USER_ROLE.EXTERNAL_DOCTOR),
  );

  return {
    ...user,
    roles,
    isExternalDoctor,
  };
};

const decodeBase64Url = (value) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = window.atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

const decodeTokenPayload = (token) => {
  try {
    const payload = token.split('.')[1];
    return payload ? JSON.parse(decodeBase64Url(payload)) : null;
  } catch {
    return null;
  }
};

const isTokenExpired = (payload) =>
  typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now();

const userFromToken = (payload, profile) => ({
  id: payload.sub,
  username: payload.username || profile.username,
  email: payload.email || profile.email,
  fullName: payload.fullName || profile.fullName,
  roles: Array.isArray(payload.roles) ? payload.roles : profile.roles || [],
  service: profile.service || null,
  isExternalDoctor: Boolean(
    payload.isExternalDoctor || profile.isExternalDoctor,
  ),
});

const clearAuthData = () => {
  sessionVersion += 1;
  refreshPromise = null;
  authStorage.clearSession();
};

export const authService = {
  async login(email, password) {
    clearAuthData();
    const version = sessionVersion;

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

    if (version !== sessionVersion) {
      throw new Error('Login superseded by another session change');
    }

    const normalizedUser = normalizeUser(data.user);

    authStorage.setSession({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      user: normalizedUser,
    });

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
    sessionVersion += 1;
    refreshPromise = null;

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
      authStorage.clearSession();
      notifyAuthChange();
    }
  },

  clearSession() {
    clearAuthData();
    notifyAuthChange();
  },

  getCurrentUser() {
    return normalizeUser(authStorage.getUser());
  },

  getToken() {
    return authStorage.getAccessToken();
  },

  getRefreshToken() {
    return authStorage.getRefreshToken();
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

    const version = sessionVersion;
    const promise = (async () => {
      const user = this.getCurrentUser();
      const currentRefreshToken = this.getRefreshToken();

      if (!currentRefreshToken || !user?.id) {
        if (version === sessionVersion) {
          await this.logout();
        }
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
          if (version === sessionVersion) {
            await auditService.logAction(
              'TOKEN_REFRESH_FAILED',
              'authentication',
              user.id,
              'Token refresh failed - logging out user',
            ).catch(() => {});
            await this.logout();
          }
          throw new Error(data.message || 'Token refresh failed');
        }

        if (version !== sessionVersion) {
          throw new Error('Session changed during token refresh');
        }

        const normalizedUser = normalizeUser(data.user);

        authStorage.setSession({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          user: normalizedUser,
        });

        notifyAuthChange();

        return {
          ...data,
          user: normalizedUser,
        };
      } catch (error) {
        if (version === sessionVersion) {
          await this.logout();
        }
        throw error;
      }
    })();

    refreshPromise = promise;
    try {
      return await promise;
    } finally {
      if (refreshPromise === promise) {
        refreshPromise = null;
      }
    }
  },

  async validateSession() {
    const token = this.getToken();
    const payload = token ? decodeTokenPayload(token) : null;

    if (!token || !payload?.sub) {
      clearAuthData();
      return null;
    }

    if (isTokenExpired(payload)) {
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

    const version = sessionVersion;

    try {
      const response = await fetch(`${API_URL}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (version !== sessionVersion || !response.ok) {
        if (version === sessionVersion) {
          clearAuthData();
        }
        return null;
      }

      const profile = await response.json();
      if (version !== sessionVersion) {
        return null;
      }

      const normalizedUser = normalizeUser(userFromToken(payload, profile));
      authStorage.setUser(normalizedUser);

      return {
        user: { ...normalizedUser, token },
        token,
      };
    } catch {
      if (version === sessionVersion) {
        clearAuthData();
      }
      return null;
    }
  },
};
