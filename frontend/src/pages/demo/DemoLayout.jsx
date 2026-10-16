/**
 * DemoLayout — shell for the /demo tree: banner, Sidebar, Navbar, Outlet.
 *
 * R2: the demo axios transport is installed SYNCHRONOUSLY during render,
 * before any child page renders or runs effects (React runs child effects
 * before parent effects, so a parent-only effect install would race the
 * first data fetch). installDemoTransport is idempotent-guarded here with
 * isDemoTransportInstalled() because the transport itself refuses a double
 * install.
 *
 * R6: a cold visitor (no demo user) is bounced to /demo — the transport is
 * never installed for them, so nothing can hit the network.
 *
 * R8: unmount restores the exact previous adapter. Under StrictMode the
 * cleanup+re-setup flush is synchronous and axios dispatch runs in a
 * microtask, so the child re-fetch always sees the re-installed transport.
 *
 * Layout structure mirrors Layout.jsx (same Sidebar/Navbar/main classes)
 * but is intentionally NOT reused — Layout wraps MerchantSubscriptionProvider
 * and has the merchant expiry ribbon; the demo shell needs neither.
 */
import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDemo } from '../../context/DemoContext';
import {
  installDemoTransport,
  uninstallDemoTransport,
  isDemoTransportInstalled
} from '../../demo/adapter';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function DemoLayout() {
  const { user, loading, exitDemo } = useAuth();
  const { store } = useDemo();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Re-ensure after StrictMode's synchronous cleanup flush; uninstall on
  // real unmount (exact previous adapter restored — R8).
  useEffect(() => {
    if (!isDemoTransportInstalled()) {
      installDemoTransport(store);
    }
    return () => {
      uninstallDemoTransport();
    };
  }, [store]);

  if (loading) {
    return <LoadingSpinner size="large" fullPage />;
  }

  // Cold /demo/* (or after exit) -> /demo entry (R6). Redirect happens in
  // the SAME render that would otherwise mount children, so no child ever
  // renders (or fetches) without a demo user. Transport not installed here.
  if (!user?.isDemo) {
    return <Navigate to="/demo" replace />;
  }

  // R2 render-phase gate: transport must be live before <Outlet/> children
  // render — their effects fire before this component's effect above.
  if (!isDemoTransportInstalled()) {
    installDemoTransport(store);
  }

  // Exit must batch identity clear + navigation in one event handler;
  // two separate updates would re-render DemoLayout with user === null
  // and bounce to /demo (re-entering) before navigate lands.
  const handleExit = () => {
    exitDemo();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-bgLight dark:bg-darkBg transition-colors duration-200">
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Demo banner — always visible, both viewports */}
        <div
          className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-100"
          role="status"
        >
          <span className="font-bold uppercase tracking-wide">
            Demo mode: sample data, no real account
          </span>
          <span className="flex items-center gap-2">
            <button
              onClick={() => navigate('/register')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors font-semibold"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Sign up
            </button>
            <button
              onClick={handleExit}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors font-semibold"
            >
              <LogOut className="w-3.5 h-3.5" />
              Exit demo
            </button>
          </span>
        </div>

        <Navbar onMenuToggle={() => setMobileMenuOpen(true)} />

        <main className="flex-1 p-5 md:p-8 max-w-7xl w-full mx-auto overflow-y-auto overflow-x-clip pb-32">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
