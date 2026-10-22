import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  const [ribbonCopies, setRibbonCopies] = useState(6);
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

  // Duration estimate from the text length, used until the track is measured
  // (and wherever measurement is unavailable). Never a fixed 15s, so the very
  // first frame already scrolls at the right speed. ~7.5px per bold char at
  // text-sm; travel spans half of the (even) copy set. 50 px/s desktop.
  const estimatedRibbonDuration = (() => {
    const copyWidth = (ribbonText.length + 16) * 7.5; // + px-8 padding both sides
    const travel = (copyWidth * ribbonCopies) / 2;
    return Math.max(travel / 50, 1);
  })();

  // Measure before first paint: one copy's width decides how many copies the
  // track needs (so travelling half the track never exposes a gap) and the
  // exact duration of the seamless 0% -> -50% loop at 50 px/s desktop /
  // 40 px/s mobile.
  useLayoutEffect(() => {
    if (!showExpiryRibbon) return undefined;
    const measure = () => {
      const track = ribbonTrackRef.current;
      const firstCopy = track?.firstElementChild;
      if (!track || !firstCopy) return;
      const copyWidth = firstCopy.getBoundingClientRect().width;
      if (!copyWidth) return; // not measurable (e.g. jsdom) - keep the estimate
      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      const speed = isMobile ? 40 : 50; // px/second
      // The track must stay at least two viewports wide so half a track of
      // travel still covers the screen on every frame.
      const needed = Math.ceil((window.innerWidth * 2) / copyWidth);
      const copies = Math.max(4, needed % 2 === 0 ? needed : needed + 1);
      if (copies !== ribbonCopies) setRibbonCopies(copies);
      const travel = (copies * copyWidth) / 2; // keyframes translateX(0) -> translateX(-50%)
      setRibbonDuration(Math.max(travel / speed, 1));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [showExpiryRibbon, ribbonText, ribbonCopies]);

  // Pause on tab hide so the loop doesn't drift while off-screen.
  useEffect(() => {
    if (!showExpiryRibbon) return undefined;
    const onVisibility = () => setRibbonPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [showExpiryRibbon]);

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
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
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
              animation: `ribbon-scroll ${ribbonDuration ?? estimatedRibbonDuration}s linear infinite`,
              width: 'max-content',
              animationPlayState: ribbonPaused ? 'paused' : 'running',
            }}
          >
            {/* Even count of identical copies => second half mirrors the first. */}
            {Array.from({ length: ribbonCopies }, (_, i) => (
              <span key={i} className="px-8">{ribbonText}</span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
