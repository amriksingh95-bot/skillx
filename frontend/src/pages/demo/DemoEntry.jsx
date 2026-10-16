/**
 * DemoEntry — the /demo index route. Creates the demo identity and hands
 * off to /demo/dashboard.
 *
 * R4: waits for AuthContext initAuth (loading === false) before deciding.
 * A real signed-in user is redirected to their role dashboard — the demo
 * identity is never entered. Cold visits (no user) reset the store to
 * pristine fixtures, call enterDemo(), then redirect (R6).
 */
import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getDemoStore } from '../../context/DemoContext';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function DemoEntry() {
  const { user, loading, enterDemo } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (user && !user.isDemo) return; // real user: never enter demo (R4)
    if (!user?.isDemo) {
      // Entering: pristine fixtures every session (R6). No-op for
      // an already-demo user (reload restarts from the same pristine state
      // anyway — the store singleton dies with the page).
      getDemoStore().reset();
      enterDemo();
    }
  }, [loading, user, enterDemo, navigate]);

  if (loading) {
    return <LoadingSpinner size="large" fullPage />;
  }

  // Real user hit /demo — send them to their role dashboard (R4)
  if (user && !user.isDemo) {
    if (user.role === 'super_admin') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'merchant') {
      if (user.merchantStatusCode) {
        return <Navigate to={`/suspended?code=${user.merchantStatusCode}`} replace />;
      }
      return <Navigate to="/merchant/dashboard" replace />;
    }
    return <Navigate to="/customer/dashboard" replace />;
  }

  if (!user?.isDemo) {
    // enterDemo() is committed in the effect above; wait one render
    return <LoadingSpinner size="large" fullPage />;
  }

  return <Navigate to="/demo/dashboard" replace />;
}
