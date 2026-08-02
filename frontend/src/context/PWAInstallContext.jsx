import { createContext, useContext } from 'react';
import usePWAInstall from '../hooks/usePWAInstall';

const PWAInstallContext = createContext(null);

export function PWAInstallProvider({ children }) {
  const pwa = usePWAInstall();
  return (
    <PWAInstallContext.Provider value={pwa}>
      {children}
    </PWAInstallContext.Provider>
  );
}

export function usePWAInstallContext() {
  return useContext(PWAInstallContext);
}
