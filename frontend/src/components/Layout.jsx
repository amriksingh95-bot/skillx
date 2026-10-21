import React, { useEffect, useRef, useState } from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMerchantSubscription } from '../context/MerchantSubscriptionContext';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import LoadingSpinner from './LoadingSpinner';
import SubscriptionExpiredModal from './SubscriptionExpiredModal';
import { ribbonSubscriptionText } from '../utils/subscriptionText';

export default function Layout() {
  const { isAuthenticated, loading, user } = useAuth();
  const { subscription } = useMerchantSubscription();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [ribbonDuration, setRibbonDuration] = useState(null);
  const [ribbonPaused, setRibbonPaused] = useState(false);
  const ribbonTrackRef = useRef(null);
  const navigate = useNavigate();

  const showExpiryRibbon = (() => {
    if (user?.role !== 'merchant') return false;
    if (!subscription?.endDate) return false;
    const daysLeft = Math.ceil((new Date(subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 3;
  })();

  const ribbonText = ribbonSubscriptionText(subscription);

  useEffect(() => {
    if (!showExpiryRibbon) return undefined;
    const measure = () => {
      const el = ribbonTrackRef.current;
      if (!el || !el.scrollWidth) return;
      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      const speed = isMobile ? 40 : 50; // px/second
      const travel = el.scrollWidth * 2; // keyframes translateX(100%) -> translateX(-100%)
      setRibbonDuration(Math.max(travel / speed, 1));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [showExpiryRibbon, ribbonText]);

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
          @media (prefers-reduced-motion: reduce) {
            .expiry-ribbon-track { animation: none !important; }
          }
        `}</style>
      )}

      <div className="flex min-h-screen bg-bgLight dark:bg-darkBg transition-colors duration-200">
        {/* Sidebar navigation */}
        <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
        
        {/* Main viewport */}
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar onMenuToggle={() => setMobileMenuOpen(true)} />
          
          <main className="flex-1 p-5 md:p-8 max-w-7xl w-full mx-auto overflow-y-auto overflow-x-clip pb-32">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Expired-beyond-grace subscription popup — merchant only, snoozable */}
      <SubscriptionExpiredModal />

      {/* Expiry Ribbon — fixed at viewport bottom, merchant only, <=3 days */}
      {showExpiryRibbon && (
        <div
          onClick={() => navigate('/merchant/subscription')}
          onMouseEnter={() => setRibbonPaused(true)}
          onMouseLeave={() => setRibbonPaused(false)}
          onTouchStart={() => setRibbonPaused(true)}
          onTouchEnd={() => setRibbonPaused(false)}
          className="fixed bottom-0 left-0 right-0 z-50 bg-amber-600 text-white cursor-pointer overflow-hidden shadow-lg"
          style={{ height: '36px' }}
        >
          <div
            ref={ribbonTrackRef}
            className="whitespace-nowrap flex items-center h-full text-sm font-bold tracking-wide expiry-ribbon-track"
            style={{
              animation: `ribbon-scroll ${ribbonDuration ?? 15}s linear infinite`,
              width: 'max-content',
              animationPlayState: ribbonPaused ? 'paused' : 'running',
            }}
          >
            <span className="px-8">{ribbonText}</span>
            <span className="px-8">{ribbonText}</span>
            <span className="px-8">{ribbonText}</span>
            <span className="px-8">{ribbonText}</span>
            <span className="px-8">{ribbonText}</span>
          </div>
        </div>
      )}
    </>
  );
}
