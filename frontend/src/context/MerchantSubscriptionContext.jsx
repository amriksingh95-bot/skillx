import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const MerchantSubscriptionContext = createContext({ subscription: null, loading: false });

export function MerchantSubscriptionProvider({ children }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'merchant') {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchSubscription = async () => {
      try {
        const res = await api.get('/api/merchant/subscription');
        if (!cancelled) {
           const d = res.data.data;
           setSubscription({ ...d.subscription, daysRemaining: d.daysRemaining, isActive: d.isActive, status: d.status, availablePlans: d.availablePlans });
        }
      } catch (err) {
        if (!cancelled) {
          setSubscription(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchSubscription();

    return () => { cancelled = true; };
  }, [user]);

  return (
    <MerchantSubscriptionContext.Provider value={{ subscription, loading }}>
      {children}
    </MerchantSubscriptionContext.Provider>
  );
}

export function useMerchantSubscription() {
  return useContext(MerchantSubscriptionContext);
}
