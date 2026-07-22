import React, { useState } from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMerchantSubscription } from '../context/MerchantSubscriptionContext';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import LoadingSpinner from './LoadingSpinner';

export default function Layout() {
  const { isAuthenticated, loading, user } = useAuth();
  const { subscription } = useMerchantSubscription();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const showExpiryRibbon = (() => {
    if (user?.role !== 'merchant') return false;
    if (!subscription?.endDate) return false;
    const daysLeft = Math.ceil((new Date(subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 3;
  })();

  const expiryDateStr = subscription?.endDate
    ? new Date(subscription.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';

  const expiryLabel = (() => {
    if (!subscription?.endDate) return '';
    const daysLeft = Math.ceil((new Date(subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 0 ? 'expired on' : 'expires on';
  })();

  if (loading) {
    return <LoadingSpinner size="large" fullPage />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      {showExpiryRibbon && (
        <style>{`
          @keyframes ribbon-scroll {
            0% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
          }
        `}</style>
      )}

      <div className="flex min-h-screen bg-bgLight dark:bg-darkBg transition-colors duration-200">
        {/* Sidebar navigation */}
        <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
        
        {/* Main viewport */}
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar onMenuToggle={() => setMobileMenuOpen(true)} />
          
          <main className="flex-1 p-5 md:p-8 max-w-7xl w-full mx-auto overflow-y-auto pb-32">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Expiry Ribbon — fixed at viewport bottom, merchant only, <=3 days */}
      {showExpiryRibbon && (
        <div
          onClick={() => navigate('/merchant/subscription')}
          className="fixed bottom-0 left-0 right-0 z-50 bg-amber-600 text-white cursor-pointer overflow-hidden shadow-lg"
          style={{ height: '36px' }}
        >
          <div
            className="whitespace-nowrap flex items-center h-full text-sm font-bold tracking-wide"
            style={{ animation: 'ribbon-scroll 15s linear infinite', width: 'max-content' }}
          >
            <span className="px-8">Your subscription {expiryLabel} {expiryDateStr} — renew now</span>
            <span className="px-8">Your subscription {expiryLabel} {expiryDateStr} — renew now</span>
            <span className="px-8">Your subscription {expiryLabel} {expiryDateStr} — renew now</span>
            <span className="px-8">Your subscription {expiryLabel} {expiryDateStr} — renew now</span>
            <span className="px-8">Your subscription {expiryLabel} {expiryDateStr} — renew now</span>
          </div>
        </div>
      )}
    </>
  );
}
