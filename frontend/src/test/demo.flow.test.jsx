/**
 * Phase 2 demo flow tests — the 3 critical ones:
 *   a. StrictMode render-phase transport install + exact adapter restore (R2/R8)
 *   b. demo exit/logout never clears seeded real localStorage keys (R3)
 *   c. demo user hitting merchant/admin/customer dashboards lands on
 *      /demo/dashboard, never granted access, never /login (R7)
 *
 * Polyfills live here only (setup.js / vite.config.js are untouched).
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext';
import { PWAInstallProvider } from '../context/PWAInstallContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { DemoProvider } from '../context/DemoContext';
import DemoEntry from '../pages/demo/DemoEntry';
import DemoLayout from '../pages/demo/DemoLayout';
import RoleGuard from '../components/RoleGuard';
import CustomerDashboard from '../pages/customer/CustomerDashboard';
import api from '../services/api';
import { isDemoTransportInstalled } from '../demo/adapter';

// --- jsdom polyfills (test file only) ---
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = window.ResizeObserver || ResizeObserverMock;

if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    }
  });
}
// --- end polyfills ---

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function LogoutProbe() {
  const { logout } = useAuth();
  return <button onClick={logout}>call logout</button>;
}

function Harness({ initialEntries, strict = false }) {
  const tree = (
    <ThemeProvider>
      <PWAInstallProvider>
        <AuthProvider>
          <DemoProvider>
            <MemoryRouter initialEntries={initialEntries}>
              <LocationProbe />
              <nav>
                <Link to="/merchant/dashboard">to merchant</Link>
                <Link to="/admin/dashboard">to admin</Link>
                <Link to="/customer/dashboard">to customer</Link>
                <Link to="/login">to login</Link>
              </nav>
              <LogoutProbe />
              <Routes>
                <Route path="/demo" element={<DemoEntry />} />
                <Route path="/demo/*" element={<DemoLayout />}>
                  <Route path="dashboard" element={<CustomerDashboard />} />
                  <Route path="partners" element={<div>partners-page</div>} />
                  <Route path="profile" element={<div>profile-page</div>} />
                  <Route path="*" element={<Navigate to="/demo/dashboard" replace />} />
                </Route>
                <Route
                  path="/merchant/dashboard"
                  element={
                    <RoleGuard allowedRoles={['merchant']}>
                      <div>merchant-page</div>
                    </RoleGuard>
                  }
                />
                <Route
                  path="/admin/dashboard"
                  element={
                    <RoleGuard allowedRoles={['super_admin']}>
                      <div>admin-page</div>
                    </RoleGuard>
                  }
                />
                <Route
                  path="/customer/dashboard"
                  element={
                    <RoleGuard allowedRoles={['customer']}>
                      <div>customer-page</div>
                    </RoleGuard>
                  }
                />
                <Route path="/login" element={<div>login-page</div>} />
                <Route path="/register" element={<div>register-page</div>} />
              </Routes>
            </MemoryRouter>
          </DemoProvider>
        </AuthProvider>
      </PWAInstallProvider>
    </ThemeProvider>
  );
  return strict ? <React.StrictMode>{tree}</React.StrictMode> : tree;
}

const settle = (fn) => fn({ timeout: 5000 });

describe('Phase 2 demo flow', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('a. StrictMode: mounts without throw, transport installed, unmount restores exact previous adapter', async () => {
    const originalAdapter = api.defaults.adapter;

    const { unmount } = render(<Harness initialEntries={['/demo']} strict />);
    await settle(() => screen.findByText(/demo mode/i));
    await settle(() => screen.findByText(/available points balance/i));

    expect(isDemoTransportInstalled()).toBe(true);
    expect(api.defaults.adapter).not.toBe(originalAdapter);

    unmount();
    expect(isDemoTransportInstalled()).toBe(false);
    expect(api.defaults.adapter).toBe(originalAdapter);
  });

  it('b. demo logout and exit never clear seeded real refreshToken/user keys', async () => {
    render(<Harness initialEntries={['/demo']} />);
    await settle(() => screen.findByText(/available points balance/i));

    // Seed AFTER initAuth has settled so only demo actions are under test
    localStorage.setItem('refreshToken', 'seed-rt');
    localStorage.setItem('user', 'seed-user');

    fireEvent.click(screen.getByRole('button', { name: /call logout/i }));
    expect(localStorage.getItem('refreshToken')).toBe('seed-rt');
    expect(localStorage.getItem('user')).toBe('seed-user');

    // DemoLayout bounced to /demo which re-enters; exit from the banner
    await settle(() => screen.findByText(/demo mode/i));
    fireEvent.click(screen.getByText(/^exit demo$/i));
    await screen.findByText('login-page');

    expect(localStorage.getItem('refreshToken')).toBe('seed-rt');
    expect(localStorage.getItem('user')).toBe('seed-user');
  });

  it('c. demo user on merchant/admin/customer dashboards lands on /demo/dashboard (never granted, never /login)', async () => {
    render(<Harness initialEntries={['/demo']} />);
    await settle(() => screen.findByText(/available points balance/i));

    const location = () => screen.getByTestId('location').textContent;

    fireEvent.click(screen.getByText('to merchant'));
    await waitFor(() => expect(location()).toBe('/demo/dashboard'));
    expect(screen.queryByText('merchant-page')).toBeNull();

    fireEvent.click(screen.getByText('to admin'));
    await waitFor(() => expect(location()).toBe('/demo/dashboard'));
    expect(screen.queryByText('admin-page')).toBeNull();

    fireEvent.click(screen.getByText('to customer'));
    await waitFor(() => expect(location()).toBe('/demo/dashboard'));
    expect(screen.queryByText('customer-page')).toBeNull();
  });
});
