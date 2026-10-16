/**
 * SimulatorModal — demo-only earn/redeem simulator (Phase 3).
 *
 * Talks to the demo transport routes POST /api/customer/simulate/earn and
 * /api/customer/simulate/redeem (adapter.js:168-184). On success the store
 * notifies DemoContext, whose version bump remounts the /demo <Outlet/>
 * so dashboard/profile refetch — no shared-page edits needed.
 */
import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../Modal';
import api from '../../services/api';
import { useDemo } from '../../context/DemoContext';

export default function SimulatorModal({ isOpen, onClose, merchantId, mode = 'earn' }) {
  const { store } = useDemo();
  const merchants = useMemo(
    () => store.getMerchants().filter((m) => m.isActive),
    [store]
  );

  const [activeMode, setActiveMode] = useState(mode);
  const [selectedMerchantId, setSelectedMerchantId] = useState('');
  const [amount, setAmount] = useState('');
  const [pointsToRedeem, setPointsToRedeem] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveMode(mode);
      setSelectedMerchantId(merchantId || merchants[0]?.id || '');
      setAmount('');
      setPointsToRedeem('');
      setBillAmount('');
      setBusy(false);
    }
    // merchants is stable per store instance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, merchantId]);

  const submitEarn = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.post('/api/customer/simulate/earn', {
        merchantId: selectedMerchantId,
        purchaseAmount: amount
      });
      toast.success(res.data.message || `You earned ${res.data.data?.points} points!`);
      setAmount('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not simulate earning.');
    } finally {
      setBusy(false);
    }
  };

  const submitRedeem = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.post('/api/customer/simulate/redeem', {
        merchantId: selectedMerchantId,
        pointsToRedeem: Number(pointsToRedeem),
        billAmount
      });
      toast.success(res.data.message || `Redeemed ${res.data.data?.pointsDeducted} points!`);
      setPointsToRedeem('');
      setBillAmount('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not simulate redemption.');
    } finally {
      setBusy(false);
    }
  };

  const merchantSelect = (
    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
      Merchant
      <select
        value={selectedMerchantId}
        onChange={(e) => setSelectedMerchantId(e.target.value)}
        className="mt-1 w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        {merchants.map((m) => (
          <option key={m.id} value={m.id}>
            {m.businessName} — {m.city}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Try the rewards simulator" size="md">
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Demo only — simulated transactions update this session&apos;s sample data. No real
        account or network is involved.
      </p>

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setActiveMode('earn')}
          className={`flex-1 px-3 py-2 rounded-xl text-sm font-bold border transition-colors ${
            activeMode === 'earn'
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
          }`}
        >
          Earn points
        </button>
        <button
          type="button"
          onClick={() => setActiveMode('redeem')}
          className={`flex-1 px-3 py-2 rounded-xl text-sm font-bold border transition-colors ${
            activeMode === 'redeem'
              ? 'bg-primary text-white border-primary'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
          }`}
        >
          Redeem points
        </button>
      </div>

      {activeMode === 'earn' ? (
        <form onSubmit={submitEarn} className="space-y-4">
          {merchantSelect}
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Purchase amount (₹)
            <input
              type="number"
              min="1"
              step="any"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 250"
              className="mt-1 w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Earn 1 point per ₹10 spent (rounded down). Points expire after 365 days.
          </p>
          <button
            type="submit"
            disabled={busy || !selectedMerchantId}
            className="w-full px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold transition-colors btn-press"
          >
            {busy ? 'Simulating…' : 'Simulate earning'}
          </button>
        </form>
      ) : (
        <form onSubmit={submitRedeem} className="space-y-4">
          {merchantSelect}
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Points to redeem (min 100)
            <input
              type="number"
              min="100"
              step="1"
              required
              value={pointsToRedeem}
              onChange={(e) => setPointsToRedeem(e.target.value)}
              placeholder="e.g. 100"
              className="mt-1 w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Bill amount (₹)
            <input
              type="number"
              min="1"
              step="any"
              required
              value={billAmount}
              onChange={(e) => setBillAmount(e.target.value)}
              placeholder="e.g. 250"
              className="mt-1 w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            1 point = ₹0.10 discount; a 5% platform fee applies on the discount value.
          </p>
          <button
            type="submit"
            disabled={busy || !selectedMerchantId}
            className="w-full px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-sm font-bold transition-colors btn-press"
          >
            {busy ? 'Simulating…' : 'Simulate redemption'}
          </button>
        </form>
      )}
    </Modal>
  );
}
