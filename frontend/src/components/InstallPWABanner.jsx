import React, { useState, useEffect, useCallback } from 'react';
import { X, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePWAInstallContext } from '../context/PWAInstallContext';

const DISMISS_KEY = 'pwa-install-dismissed';
const IOS_DISMISS_KEY = 'pwa-ios-install-dismissed';
const DISMISS_DAYS = 7;

function isDismissed(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (Number.isNaN(dismissedAt)) return false;
    const elapsed = Date.now() - dismissedAt;
    return elapsed < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function setDismissed(key) {
  try {
    localStorage.setItem(key, String(Date.now()));
  } catch {
    // storage full or blocked — ignore
  }
}

function isIOSSafari() {
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isNotChrome = !ua.includes('CriOS');
  return isIOS && isNotChrome;
}

export default function InstallPWABanner() {
  const { canInstall, promptInstall, isInstalled } = usePWAInstallContext();
  const [dismissed, setDismissedState] = useState(() => isDismissed(DISMISS_KEY));
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    if (isIOSSafari() && !isInstalled && !isDismissed(IOS_DISMISS_KEY)) {
      setShowIOSHint(true);
    }
  }, [isInstalled]);

  const handleDismiss = useCallback(() => {
    setDismissedState(true);
    setDismissed(DISMISS_KEY);
  }, []);

  const handleIOSDismiss = useCallback(() => {
    setShowIOSHint(false);
    setDismissed(IOS_DISMISS_KEY);
  }, []);

  const handleInstall = useCallback(async () => {
    const accepted = await promptInstall();
    if (accepted) {
      toast.success('SkillXT installed!');
    }
  }, [promptInstall]);

  // Don't render if installed, dismissed, or no prompt available
  const showBanner = canInstall && !dismissed;

  if (!showBanner && !showIOSHint) return null;

  // Android / Desktop — full bottom sheet banner
  if (showBanner) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[9998] p-4 pointer-events-none">
        <div className="pointer-events-auto mx-auto max-w-lg animate-slide-up">
          <div className="ui-card p-4 flex items-center gap-4 shadow-dropdown">
            <div className="shrink-0 p-2.5 bg-primary/10 dark:bg-primary/20 rounded-xl text-primary">
              <Download className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary dark:text-white">
                Add SkillXT to your Home Screen
              </p>
              <p className="text-xs text-text-tertiary dark:text-slate-400 mt-0.5">
                Quick access, just like an app
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleInstall}
                className="ui-btn-primary !px-3.5 !py-2 !text-xs btn-press"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="p-2 rounded-xl text-text-tertiary hover:text-text-primary dark:text-slate-400 dark:hover:text-white hover:bg-surface-secondary dark:hover:bg-slate-800 transition-colors btn-press"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // iOS Safari — simple tooltip
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9998] p-4 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-lg animate-slide-up">
        <div className="ui-card p-4 flex items-center gap-3 shadow-dropdown">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary dark:text-white">
              Tap <span className="text-primary font-bold">Share</span>, then &ldquo;Add to Home Screen&rdquo;
            </p>
            <p className="text-xs text-text-tertiary dark:text-slate-400 mt-0.5">
              Quick access to SkillXT, just like an app
            </p>
          </div>
          <button
            onClick={handleIOSDismiss}
            className="shrink-0 p-2 rounded-xl text-text-tertiary hover:text-text-primary dark:text-slate-400 dark:hover:text-white hover:bg-surface-secondary dark:hover:bg-slate-800 transition-colors btn-press"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
