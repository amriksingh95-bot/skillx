/**
 * DemoContext — provides the single in-memory demo store to the /demo tree.
 *
 * The store singleton is module-level and guarded so React StrictMode's
 * double-invoked useState initializers / remount simulation always see the
 * SAME store instance (a per-component useState(createDemoStore) would build
 * two stores and leak the first one's adapter bindings).
 */
import React, { createContext, useContext, useMemo, useRef } from 'react';
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

  const value = useMemo(() => ({ store }), [store]);
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
}
