import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

let isLoggingOut = false;

// Generation counter — login() increments, initAuth() bails if it changed
const _authGeneration = { current: 0 };

// Module-level navigate function — set by <NavigateSetter /> inside Router
let _navigate = null;
export function setAppNavigate(fn) { _navigate = fn; }

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  // Clear auth states locally
  const handleLogoutLocal = () => {
    setUser(null);
    setAccessToken(null);
    delete api.defaults.headers.common['Authorization'];
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  };

  // Decode JWT payload (no verification — just reads { userId, role })
  const decodeAccessToken = (token) => {
    try {
      const base64 = token.split('.')[1];
      return JSON.parse(atob(base64));
    } catch {
      return null;
    }
  };

  // 1. Silent refresh on mount
  useEffect(() => {
    let cancelled = false;

    const initAuth = async () => {
      const genAtStart = _authGeneration.current;
      try {
        const storedRefreshToken = localStorage.getItem('refreshToken');

        if (storedRefreshToken) {
          try {
            const response = await axios.post(`${API_BASE_URL}/api/auth/refresh-token`, {
              refreshToken: storedRefreshToken
            });

            if (cancelled) return;
            if (_authGeneration.current !== genAtStart) return;
            if (!localStorage.getItem('refreshToken')) return;

            const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data;
            setAccessToken(newAccessToken);
            if (newRefreshToken) {
              localStorage.setItem('refreshToken', newRefreshToken);
            }
            api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;

            const payload = decodeAccessToken(newAccessToken);
            if (payload && payload.userId && payload.role) {
              const userData = { id: payload.userId, role: payload.role, name: payload.name };

              if (payload.role === 'merchant') {
                try {
                  const profileRes = await api.get('/api/merchant/profile');
                  const merchant = profileRes.data?.data;
                  if (merchant && merchant.status && merchant.status !== 'active') {
                    const statusToCode = {
                      pending: 'ACCOUNT_PENDING',
                      approved: 'PAYMENT_REQUIRED',
                      payment_pending: 'PAYMENT_UNDER_VERIFICATION',
                      suspended: 'ACCOUNT_SUSPENDED',
                      deactivated: 'ACCOUNT_DEACTIVATED'
                    };
                    userData.merchantStatus = merchant.status;
                    userData.merchantStatusCode = statusToCode[merchant.status] || null;
                  }
                } catch {
                  // Profile fetch failed — proceed without status
                }
              }

              if (_authGeneration.current !== genAtStart) return;
              setUser(userData);
            }
          } catch (error) {
            if (!cancelled && _authGeneration.current === genAtStart) {
              setUser(null);
              setAccessToken(null);
              delete api.defaults.headers.common['Authorization'];
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('user');
            }
          }
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();
    return () => { cancelled = true; };
  }, []);

  // 2. Configure Axios Interceptors
  useEffect(() => {
    // Inject token to every outgoing request
    const requestInterceptor = api.interceptors.request.use(
      (config) => {
        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Watch for 401 TOKEN_EXPIRED to perform silent refresh and retry
    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (
          error.response &&
          error.response.data &&
          (error.response.data.code === 'ACCOUNT_SUSPENDED' || error.response.data.code === 'ACCOUNT_DEACTIVATED')
        ) {
          handleLogoutLocal();
          if (_navigate) {
            _navigate(`/suspended?code=${error.response.data.code}`);
          } else {
            window.location.href = `/suspended?code=${error.response.data.code}`;
          }
          return Promise.reject(error);
        }

        if (
          error.response &&
          error.response.data &&
          (error.response.data.code === 'ACCOUNT_PENDING' || error.response.data.code === 'PAYMENT_REQUIRED' || error.response.data.code === 'PAYMENT_UNDER_VERIFICATION')
        ) {
          if (_navigate) {
            _navigate(`/suspended?code=${error.response.data.code}`);
          } else {
            window.location.href = `/suspended?code=${error.response.data.code}`;
          }
          return Promise.reject(error);
        }

        // Retry once on 401 if a valid accessToken exists but wasn't attached
        // (covers the interceptor eject/reattach gap when accessToken first resolves)
        if (
          error.response &&
          error.response.status === 401 &&
          error.response.data &&
          error.response.data.code === 'UNAUTHORIZED' &&
          accessToken &&
          !originalRequest._retryRace
        ) {
          originalRequest._retryRace = true;
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }

        if (
          error.response &&
          error.response.status === 401 &&
          error.response.data &&
          error.response.data.code === 'TOKEN_EXPIRED' &&
          !originalRequest._retry
        ) {
          originalRequest._retry = true;
          try {
            const storedRefreshToken = localStorage.getItem('refreshToken');
            if (!storedRefreshToken) {
              handleLogoutLocal();
              return Promise.reject(error);
            }

            // Request new token
            const response = await axios.post(`${API_BASE_URL}/api/auth/refresh-token`, {
              refreshToken: storedRefreshToken
            });

            const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data;
            setAccessToken(newAccessToken);
            if (newRefreshToken) {
              localStorage.setItem('refreshToken', newRefreshToken);
            }
            api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;

            // Re-apply header and run request again
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest);
          } catch (refreshError) {
            handleLogoutLocal();
            toast.error('Session expired. Please log in again.');
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.request.eject(requestInterceptor);
      api.interceptors.response.eject(responseInterceptor);
    };
  }, [accessToken]);

  // Login handler
  const login = async (identifier, password) => {
    try {
      // Increment generation to abort any in-flight initAuth() from overwriting
      _authGeneration.current++;

      // Clear stale localStorage data to prevent initAuth from overwriting with old role
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');

      const response = await api.post('/api/auth/login', { identifier, password });
      const { accessToken: token, refreshToken: refresh, user: loggedUser } = response.data.data;

      setAccessToken(token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(loggedUser);
      localStorage.setItem('refreshToken', refresh);
      localStorage.setItem('user', JSON.stringify(loggedUser));

      toast.success(response.data.message || 'Login successful!');
      return loggedUser;
    } catch (error) {
      throw error;
    }
  };

  // Logout handler
  const logout = async () => {
    if (isLoggingOut) return;
    isLoggingOut = true;
    setLoggingOut(true);

    // Increment generation to abort any in-flight initAuth()
    _authGeneration.current++;

    const storedRefreshToken = localStorage.getItem('refreshToken');
    handleLogoutLocal();
    toast.success('Logged out successfully.');

    try {
      if (storedRefreshToken) {
        api.post('/api/auth/logout', { refreshToken: storedRefreshToken }).catch(() => {});
      }
    } finally {
      isLoggingOut = false;
      setLoggingOut(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        loading,
        loggingOut,
        login,
        logout,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
