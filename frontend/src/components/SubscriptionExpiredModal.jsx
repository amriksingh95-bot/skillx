import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import { useAuth } from '../context/AuthContext';
import { useMerchantSubscription } from '../context/MerchantSubscriptionContext';

const SNOOZE_MS = 60 * 60 * 1000; // 1 hour

function snoozeKey(userId) {
  return `subscription-expired-snoozed-until-${userId}`;
}

function getSnoozeUntil(userId) {
  try {
    const raw = localStorage.getItem(snoozeKey(userId));
    const until = Number(raw);
    return Number.isFinite(until) && until > 0 ? until : 0;
  } catch {
    return 0;
  }
}

function setSnooze(userId) {
  try {
    localStorage.setItem(snoozeKey(userId), String(Date.now() + SNOOZE_MS));
  } catch {
    // storage blocked or full — ignore
  }
}

export default function SubscriptionExpiredModal() {
  const { user } = useAuth();
  const { subscription, loading } = useMerchantSubscription();
  const navigate = useNavigate();
  const [, setSnoozeTick] = useState(0);

  const isMerchant = user?.role === 'merchant';
  const expired = !loading && subscription?.status === 'expired';

  // Re-render every minute while relevant so the popup reappears after snooze expiry
  useEffect(() => {
    if (!isMerchant || !expired) return undefined;
    const id = setInterval(() => setSnoozeTick((t) => t + 1), 60 * 1000);
    return () => clearInterval(id);
  }, [isMerchant, expired]);

  const snoozed = Date.now() < getSnoozeUntil(user?.id);
  const show = isMerchant && expired && !snoozed;

  const handleRemindLater = () => {
    setSnooze(user.id);
    setSnoozeTick((t) => t + 1);
  };

  const handleRecharge = () => {
    setSnooze(user.id);
    setSnoozeTick((t) => t + 1);
    navigate('/merchant/subscription');
  };

  return (
    <Modal
      isOpen={show}
      onClose={handleRemindLater}
      title="Your SkillXT Subscription Has Expired!"
      size="sm"
      closeOnOverlay={false}
      footer={
        <>
          <button
            type="button"
            onClick={handleRemindLater}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 border border-border dark:border-dark-border hover:bg-surface-secondary dark:hover:bg-slate-800 transition-all btn-press"
          >
            Remind Me Later
          </button>
          <button
            type="button"
            onClick={handleRecharge}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold shadow-sm transition-all btn-press"
          >
            Recharge Now
          </button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          As a special consideration, we are allowing you to continue using SkillXT Rewards temporarily. Services may be suspended at any time.
          <br />
          <br />
          Recharge now to avoid service interruptions and keep rewarding your customers!
        </p>
      </div>
    </Modal>
  );
}
