import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { AuthContext } from './useAuth';

const BASE_URL = import.meta.env.VITE_API_URL;

export const AuthProvider = ({ children }) => {
  const savedUser = localStorage.getItem('user');
  const savedToken = localStorage.getItem('access_token');
  const initialUser =
    savedUser && savedToken
      ? { ...JSON.parse(savedUser), token: savedToken }
      : null;

  const [user, setUser] = useState(initialUser);
  const [service, setService] = useState(initialUser?.service || null);
  const [isAuthenticated, setIsAuthenticated] = useState(!!initialUser);
  const [isLoading, setIsLoading] = useState(!initialUser);

  useEffect(() => {
    if (!initialUser) {
      const storedUser = localStorage.getItem('user');
      const storedToken = localStorage.getItem('access_token');
      if (storedUser && storedToken) {
        try {
          const parsedUser = JSON.parse(storedUser);
          const userWithToken = { ...parsedUser, token: storedToken };
          setUser(userWithToken);
          setService(parsedUser.service || null);
          setIsAuthenticated(true);
        } catch {
          logout();
        }
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(
          errData.message || 'Login failed due to invalid credentials',
        );
      }

      const {
        access_token,
        refresh_token,
        user: backendUser,
      } = await response.json();

      const userData = {
        ...backendUser,
        token: access_token,
        refreshToken: refresh_token,
      };

      const { token, refreshToken, ...userToSave } = userData;
      localStorage.setItem('user', JSON.stringify(userToSave));
      localStorage.setItem('access_token', token);
      localStorage.setItem('refresh_token', refreshToken);

      setUser(userData);
      setService(userData.service || null);
      setIsAuthenticated(true);

      toast.success('Login successful', {
        description: `Welcome back, ${userData.fullName || 'User'}!`,
      });

      return { success: true, user: userData };
    } catch (error) {
      toast.error('Login failed', {
        description: error.message || 'Invalid email or password',
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');

    setUser(null);
    setService(null);
    setIsAuthenticated(false);

    toast.info('Logged out', {
      description: 'You have been successfully logged out',
    });
  };

  const getToken = () => user?.token || localStorage.getItem('access_token');

  const refreshToken = async () => {
    const currentRefreshToken = localStorage.getItem('refresh_token');
    const storedUser = localStorage.getItem('user');
    const userId = user?.id || (storedUser ? JSON.parse(storedUser)?.id : null);

    if (!currentRefreshToken || !userId) {
      logout();
      throw new Error('No refresh token or user ID available.');
    }

    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, refreshToken: currentRefreshToken }),
      });

      if (!response.ok) {
        logout();
        throw new Error('Session expired. Please log in again.');
      }

      const data = await response.json();
      const newAccessToken = data.access_token;
      const newRefreshToken = data.refresh_token;
      const refreshedUser = data.user;

      localStorage.setItem('access_token', newAccessToken);
      localStorage.setItem('refresh_token', newRefreshToken);
      localStorage.setItem('user', JSON.stringify(refreshedUser));

      const updatedUserData = {
        ...refreshedUser,
        token: newAccessToken,
        refreshToken: newRefreshToken,
      };
      setUser(updatedUserData);

      return newAccessToken;
    } catch (error) {
      logout();
      toast.error('Session Expired', {
        description: 'Your session has expired. Please log in again.',
      });
      throw error;
    }
  };

  const value = {
    user,
    service,
    isLoading,
    isAuthenticated,
    login,
    logout,
    getToken,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
