/**
 * DemoContext — provides the single in-memory demo store to the /demo tree.
 *
 * The store singleton is module-level and guarded so React StrictMode's
 * double-invoked useState initializers / remount simulation always see the
 * SAME store instance (a per-component useState(createDemoStore) would build
 * two stores and leak the first one's adapter bindings).
 */
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createDemoStore } from '../demo/store.js';

const DemoContext = createContext(null);

let storeSingleton = null;

export function getDemoStore() {
  if (!storeSingleton) {
    storeSingleton = createDemoStore();
  }
  return storeSingleton;
}

export function DemoProvider({ children }) {
  const storeRef = useRef(null);
  if (!storeRef.current) {
    storeRef.current = getDemoStore();
  }
  const store = storeRef.current;

  // Version refresh: bump after every successful store mutation (simulate
  // earn/redeem, profile/email save, reset). DemoLayout keys <Outlet/> with
  // it so dashboard/profile remount and refetch — no shared-page edits.
  const [version, setVersion] = useState(0);
  useEffect(() => {
    return store.subscribe(() => setVersion((v) => v + 1));
  }, [store]);

  const value = useMemo(() => ({ store, version }), [store, version]);
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
}
