import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthContext } from './useAuth';
import { authService } from '@/services/authService';
import { authStorage, isAuthStorageKey } from '@/lib/authStorage';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [service, setService] = useState(null);
  const [authStatus, setAuthStatus] = useState('loading');
  const authEpoch = useRef(0);
  const navigate = useNavigate();

  const syncFromStorage = useCallback(() => {
    const currentUser = authService.getCurrentUser();
    const token = authService.getToken();
    if (currentUser && token) {
      setUser({ ...currentUser, token });
      setService(currentUser.service || null);
      setAuthStatus('authenticated');
    } else {
      authStorage.clearRefreshToken();
      setUser(null);
      setService(null);
      setAuthStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      const epoch = authEpoch.current;
      try {
        const session = await authService.validateSession();
        if (!isMounted || epoch !== authEpoch.current) return;

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
        if (!isMounted || epoch !== authEpoch.current) return;
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

    const handleStorage = (event) => {
      if (!isMounted) return;
      if (event.key && !isAuthStorageKey(event.key)) return;
      authEpoch.current += 1;
      syncFromStorage();
    };

    window.addEventListener('auth:change', handleAuthChange);
    window.addEventListener('storage', handleStorage);

    return () => {
      isMounted = false;
      window.removeEventListener('auth:change', handleAuthChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, [syncFromStorage]);

  const login = async (email, password) => {
    const epoch = authEpoch.current + 1;
    authEpoch.current = epoch;
    setUser(null);
    setService(null);
    setAuthStatus('loading');

    try {
      const data = await authService.login(email, password);
      if (epoch !== authEpoch.current) {
        return { success: false, error: 'Login superseded by another session change' };
      }

      const userData = { ...data.user, token: data.access_token };
      setUser(userData);
      setService(data.user.service || null);
      setAuthStatus('authenticated');

      toast.success('Login successful', {
        description: `Welcome back, ${userData.fullName || 'User'}!`,
      });

      return { success: true, user: userData };
    } catch (error) {
      if (epoch !== authEpoch.current) {
        return { success: false, error: error.message };
      }

      setUser(null);
      setService(null);
      setAuthStatus('unauthenticated');
      toast.error('Login failed', {
        description: error.message || 'Invalid email or password',
      });
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    const epoch = authEpoch.current + 1;
    authEpoch.current = epoch;
    setUser(null);
    setService(null);
    setAuthStatus('unauthenticated');

    try {
      await authService.logout();
    } finally {
      if (epoch === authEpoch.current) {
        toast.info('Logged out', {
          description: 'You have been successfully logged out',
        });
        navigate('/login', { replace: true });
      }
    }
  };

  const refreshToken = async () => {
    const epoch = authEpoch.current;
    try {
      const data = await authService.refreshToken();
      if (epoch !== authEpoch.current) {
        return data.access_token;
      }

      const userData = { ...data.user, token: data.access_token };
      setUser(userData);
      setService(data.user?.service || null);
      setAuthStatus('authenticated');
      return data.access_token;
    } catch (error) {
      if (epoch === authEpoch.current) {
        setUser(null);
        setService(null);
        setAuthStatus('unauthenticated');
        toast.error('Session Expired', {
          description: 'Your session has expired. Please log in again.',
        });
      }
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
