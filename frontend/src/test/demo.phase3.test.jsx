/**
 * Phase 3 tests — simulator, demo merchant profile with offers,
 * map-link (geo) safety, and version refresh (Outlet remount).
 *
 * jsdom polyfills duplicated here only (same pattern as demo.flow.test.jsx).
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ThemeProvider } from '../context/ThemeContext';
import { PWAInstallProvider } from '../context/PWAInstallContext';
import { AuthProvider } from '../context/AuthContext';
import { DemoProvider, getDemoStore } from '../context/DemoContext';
import DemoEntry from '../pages/demo/DemoEntry';
import DemoLayout from '../pages/demo/DemoLayout';
import DemoMerchantProfile from '../pages/demo/DemoMerchantProfile';
import SimulatorModal from '../components/demo/SimulatorModal';
import { installDemoTransport, uninstallDemoTransport, isDemoTransportInstalled } from '../demo/adapter';
import { buildDirectionsUrl } from '../utils/geo';
import api from '../services/api';

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

const settle = (fn) => fn({ timeout: 5000 });

let mountCount = 0;
function MountProbe() {
  mountCount += 1;
  return <div data-testid="mount-count">{String(mountCount)}</div>;
}

describe('Phase 3 — version refresh (Outlet remount)', () => {
  beforeEach(() => {
    getDemoStore().reset();
    mountCount = 0;
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    if (isDemoTransportInstalled()) uninstallDemoTransport();
  });

  it('successful simulate earn through the transport remounts the Outlet', async () => {
    render(
      <ThemeProvider>
        <PWAInstallProvider>
          <AuthProvider>
            <DemoProvider>
              <MemoryRouter initialEntries={['/demo']}>
                <Routes>
                  <Route path="/demo" element={<DemoEntry />} />
                  <Route path="/demo/*" element={<DemoLayout />}>
                    <Route path="dashboard" element={<MountProbe />} />
                    <Route path="*" element={<div>fallback</div>} />
                  </Route>
                </Routes>
              </MemoryRouter>
            </DemoProvider>
          </AuthProvider>
        </PWAInstallProvider>
      </ThemeProvider>
    );

    await settle(() => screen.findByTestId('mount-count'));
    expect(screen.getByTestId('mount-count').textContent).toBe('1');
    expect(isDemoTransportInstalled()).toBe(true);

    await api.post('/api/customer/simulate/earn', {
      merchantId: 'demo-m-03',
      purchaseAmount: '40'
    });

    await waitFor(() => {
      expect(screen.getByTestId('mount-count').textContent).toBe('2');
    });
    expect(getDemoStore().getBalance()).toEqual({ balance: 1489 });
  });
});

describe('Phase 3 — SimulatorModal', () => {
  beforeEach(() => {
    getDemoStore().reset();
  });

  afterEach(() => {
    cleanup();
    if (isDemoTransportInstalled()) uninstallDemoTransport();
  });

  it('earns through the demo transport and updates the store', async () => {
    installDemoTransport(getDemoStore());

    render(
      <DemoProvider>
        <MemoryRouter initialEntries={['/demo']}>
          <SimulatorModal isOpen onClose={() => {}} merchantId="demo-m-03" />
        </MemoryRouter>
      </DemoProvider>
    );

    fireEvent.change(screen.getByPlaceholderText('e.g. 250'), { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: /simulate earning/i }));

    await waitFor(() => expect(getDemoStore().getSimCount()).toBe(1));
    expect(getDemoStore().getBalance()).toEqual({ balance: 1489 });
  });

  it('surfaces store validation failures without mutating the store', async () => {
    installDemoTransport(getDemoStore());
    const errorSpy = vi.spyOn(toast, 'error');

    render(
      <DemoProvider>
        <MemoryRouter initialEntries={['/demo']}>
          <SimulatorModal isOpen onClose={() => {}} merchantId="demo-m-01" />
        </MemoryRouter>
      </DemoProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /redeem points/i }));
    fireEvent.change(screen.getByPlaceholderText('e.g. 100'), { target: { value: '50' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. 250'), { target: { value: '500' } });
    // Submit the form directly: jsdom's constraint validation would block a
    // real submit-button click (input min="100"), which is browser behaviour,
    // not the store-validation path under test here.
    fireEvent.submit(screen.getByRole('button', { name: /simulate redemption/i }).closest('form'));

    await waitFor(() => expect(errorSpy).toHaveBeenCalled());
    expect(String(errorSpy.mock.calls[0][0])).toMatch(/minimum redemption limit is 100 points/i);
    expect(getDemoStore().getSimCount()).toBe(0);
    expect(getDemoStore().getBalance()).toEqual({ balance: 1485 });
    errorSpy.mockRestore();
  });
});

describe('Phase 3 — DemoMerchantProfile', () => {
  const renderProfile = (id) =>
    render(
      <DemoProvider>
        <MemoryRouter initialEntries={[`/demo/merchant/${id}`]}>
          <Routes>
            <Route path="/demo/merchant/:id" element={<DemoMerchantProfile />} />
          </Routes>
        </MemoryRouter>
      </DemoProvider>
    );

  beforeEach(() => {
    getDemoStore().reset();
  });

  afterEach(() => cleanup());

  it('renders merchant details and offers from the demo store', () => {
    renderProfile('demo-m-01');

    expect(screen.getByRole('heading', { name: /cedar kitchen restaurant/i })).toBeTruthy();
    expect(screen.getByText(/family feast combo/i)).toBeTruthy();
    expect(screen.getByText(/valid until/i)).toBeTruthy();
    expect(screen.getByText(/21 cedar lane, model town/i)).toBeTruthy();
  });

  it('renders the Directions link with geo-validated URL, new tab, and safe rel', () => {
    renderProfile('demo-m-01');

    const link = screen.getByRole('link', { name: /get directions/i });
    expect(link.getAttribute('href')).toBe(buildDirectionsUrl(30.9042, 75.8593));
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('opens the SimulatorModal from the Simulate button', () => {
    renderProfile('demo-m-01');

    expect(screen.queryByText(/try the rewards simulator/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /simulate earning \/ redeeming/i }));
    expect(screen.getByText(/try the rewards simulator/i)).toBeTruthy();
  });

  it('shows the not-found state for an unknown merchant id', () => {
    renderProfile('demo-m-99');

    expect(screen.getByText(/merchant not found/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /back to find partners/i })).toBeTruthy();
  });
});
