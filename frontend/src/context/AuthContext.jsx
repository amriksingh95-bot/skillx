import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

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
      const storedRefreshToken = localStorage.getItem('refreshToken');

      if (storedRefreshToken) {
        try {
          // Validate refresh token BEFORE setting user
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh-token`, {
            refreshToken: storedRefreshToken
          });

          // If user already logged in via login() during the refresh, skip setting user
          if (cancelled) return;
          if (!localStorage.getItem('refreshToken')) return;

          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data;
          setAccessToken(newAccessToken);
          if (newRefreshToken) {
            localStorage.setItem('refreshToken', newRefreshToken);
          }
          api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;

          // Decode JWT to get fresh role — never trust stale localStorage user data
          const payload = decodeAccessToken(newAccessToken);
          if (payload && payload.userId && payload.role) {
            setUser({ id: payload.userId, role: payload.role });
          }
        } catch (error) {
          // Token refresh failed — silently clear user, do NOT call logout()
          if (!cancelled) {
            setUser(null);
            setAccessToken(null);
            delete api.defaults.headers.common['Authorization'];
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
          }
        }
      }
      setLoading(false);
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
          window.location.href = `/suspended?code=${error.response.data.code}`;
          return Promise.reject(error);
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
    const storedRefreshToken = localStorage.getItem('refreshToken');
    try {
      if (storedRefreshToken) {
        await api.post('/api/auth/logout', { refreshToken: storedRefreshToken });
      }
    } catch (error) {
    } finally {
      handleLogoutLocal();
      toast.success('Logged out successfully.');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        loading,
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
