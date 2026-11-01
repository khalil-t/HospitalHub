import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { AuthContext } from './useAuth';
import { authService } from '@/services/authService';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [service, setService] = useState(null);
  const [authStatus, setAuthStatus] = useState('loading'); // 'loading' | 'authenticated' | 'unauthenticated'

  const syncFromStorage = useCallback(() => {
    const currentUser = authService.getCurrentUser();
    const token = authService.getToken();
    if (currentUser && token) {
      setUser({ ...currentUser, token });
      setService(currentUser.service || null);
      setAuthStatus('authenticated');
    } else {
      setUser(null);
      setService(null);
      setAuthStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const session = await authService.validateSession();
        if (!isMounted) return;

        if (session?.user) {
          setUser(session.user);
          setService(session.user.service || null);
          setAuthStatus('authenticated');
        } else {
          setUser(null);
          setService(null);
          setAuthStatus('unauthenticated');
        }
      } catch {
        if (!isMounted) return;
        setUser(null);
        setService(null);
        setAuthStatus('unauthenticated');
      }
    };

    initAuth();

    const handleAuthChange = () => {
      if (!isMounted) return;
      syncFromStorage();
    };

    window.addEventListener('auth:change', handleAuthChange);

    return () => {
      isMounted = false;
      window.removeEventListener('auth:change', handleAuthChange);
    };
  }, [syncFromStorage]);

  const login = async (email, password) => {
    setAuthStatus('loading');
    try {
      const data = await authService.login(email, password);
      const userData = { ...data.user, token: data.access_token };
      setUser(userData);
      setService(data.user.service || null);
      setAuthStatus('authenticated');

      toast.success('Login successful', {
        description: `Welcome back, ${userData.fullName || 'User'}!`,
      });

      return { success: true, user: userData };
    } catch (error) {
      setAuthStatus('unauthenticated');
      toast.error('Login failed', {
        description: error.message || 'Invalid email or password',
      });
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setService(null);
      setAuthStatus('unauthenticated');
      toast.info('Logged out', {
        description: 'You have been successfully logged out',
      });
    }
  };

  const refreshToken = async () => {
    try {
      const data = await authService.refreshToken();
      const userData = { ...data.user, token: data.access_token };
      setUser(userData);
      setService(data.user?.service || null);
      setAuthStatus('authenticated');
      return data.access_token;
    } catch (error) {
      setUser(null);
      setService(null);
      setAuthStatus('unauthenticated');
      toast.error('Session Expired', {
        description: 'Your session has expired. Please log in again.',
      });
      throw error;
    }
  };

  const value = {
    user,
    service,
    authStatus,
    isLoading: authStatus === 'loading',
    isAuthenticated: authStatus === 'authenticated',
    login,
    logout,
    getToken: () => authService.getToken(),
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
