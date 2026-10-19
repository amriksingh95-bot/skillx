import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

export default function RoleGuard({ allowedRoles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner size="large" fullPage />;
  }

  // Demo users belong only under /demo — redirect BEFORE the role check so
  // they are never granted access to /customer/*, /merchant/* or /admin/*,
  // and never bounce through /login (R7).
  if (user?.isDemo && !location.pathname.startsWith('/demo')) {
    return <Navigate to="/demo/dashboard" replace />;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    if (user) {
      // User is authenticated but role is not allowed -> redirect to their home dashboard
      if (user.role === 'super_admin') {
        return <Navigate to="/admin/dashboard" replace />;
      } else if (user.role === 'merchant') {
        return <Navigate to="/merchant/dashboard" replace />;
      } else if (user.role === 'customer') {
        return <Navigate to="/customer/dashboard" replace />;
      }
    }
    return <Navigate to="/login" replace />;
  }

  // Merchant-specific: if status is not active, redirect to /suspended
  if (user.role === 'merchant' && user.merchantStatusCode) {
    return <Navigate to={`/suspended?code=${user.merchantStatusCode}`} replace />;
  }

  return children;
}
