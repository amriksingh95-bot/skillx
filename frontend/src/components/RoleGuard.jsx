import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

export default function RoleGuard({ allowedRoles, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner size="large" fullPage />;
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

  return children;
}
