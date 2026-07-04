import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Wallet, Upload, CheckCircle, Clock, XCircle, IndianRupee, Image as ImageIcon } from 'lucide-react';

const PACKAGES = {
  starter: { label: 'Starter', amount: 500, points: 5000, icon: '🚀' },
  growth: { label: 'Growth', amount: 1000, points: 11000, icon: '📈' },
  pro: { label: 'Pro', amount: 2000, points: 25000, icon: '👑' }
};

export default function TopUp() {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [screenshot, setScreenshot] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    fetchBalance();
    fetchHistory();
  }, []);

  const fetchBalance = async () => {
    try {
      const res = await api.get('/api/merchant/profile');
      setBalance(res.data.data?.pointsBalance || 0);
    } catch (err) {
      console.error('TopUp fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get('/api/merchant/topup/history');
      setHistory(res.data.data || []);
    } catch (err) {
      console.error('TopUp fetch error:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleRequest = async (e) => {
    e.preventDefault();
    if (!selectedPackage) return;

    setIsSubmitting(true);
    try {
      const res = await api.post('/api/merchant/topup/request', {
        packageName: selectedPackage
      });
      toast.success('Top-up request created. Upload your payment screenshot.');
      await fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create top-up request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!screenshot) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('screenshot', screenshot);
      await api.post(`/api/merchant/topup/upload-screenshot`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Screenshot uploaded. Admin will verify within 24 hours.');
      setScreenshot(null);
      await fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload screenshot.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold"><Clock className="w-3 h-3" />Pending</span>;
      case 'confirmed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold"><CheckCircle className="w-3 h-3" />Confirmed</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-bold"><XCircle className="w-3 h-3" />Rejected</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white">Top Up Points</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Purchase points to issue to customers</p>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-100 mb-1">Available Balance</p>
            <p className="text-3xl font-black">{balance.toLocaleString()}</p>
            <p className="text-xs text-indigo-100 mt-1">points</p>
          </div>
          <div className="p-3 bg-white/20 rounded-xl">
            <Wallet className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Package Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(PACKAGES).map(([key, pkg]) => (
          <div
            key={key}
            onClick={() => setSelectedPackage(key)}
            className={`cursor-pointer rounded-2xl p-6 border-2 transition-all ${
              selectedPackage === key
                ? 'border-primary bg-primary/5 shadow-md'
                : 'border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card hover:border-primary/50'
            }`}
          >
            <div className="text-center space-y-3">
              <span className="text-3xl">{pkg.icon}</span>
              <h3 className="text-lg font-black text-slate-800 dark:text-white">{pkg.label}</h3>
              <div>
                <span className="text-2xl font-black text-primary">₹{pkg.amount}</span>
              </div>
              <div>
                <span className="text-xl font-black text-slate-800 dark:text-white">{pkg.points.toLocaleString()}</span>
                <p className="text-xs text-slate-400">points</p>
              </div>
              <p className="text-xs text-emerald-600 font-bold">
                +{((pkg.points / pkg.amount - 10) * 10).toFixed(0)}% bonus
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Payment & Upload Section */}
      {selectedPackage && (
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            Complete Payment for {PACKAGES[selectedPackage].label} Package
          </h3>

          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 mb-1">Amount to pay</p>
              <p className="text-xl font-black text-slate-800 dark:text-white">
                ₹{PACKAGES[selectedPackage].amount}
              </p>
              <p className="text-xs text-slate-500">You will receive {PACKAGES[selectedPackage].points.toLocaleString()} points</p>
            </div>
            <IndianRupee className="w-10 h-10 text-primary" />
          </div>

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Upload Payment Screenshot
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setScreenshot(e.target.files[0])}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
              </div>
              {screenshot && (
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <ImageIcon className="w-4 h-4" />
                  {screenshot.name}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!screenshot || isSubmitting}
              className="w-full py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting && <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" />}
              Submit Payment Proof
            </button>
          </form>
        </div>
      )}

      {/* History */}
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6">
        <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4">Top-Up History</h3>
        {historyLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent animate-spin rounded-full" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No top-up history yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-dark-border">
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Package</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Points</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-dark-border">
                {history.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-sm font-bold text-slate-800 dark:text-white capitalize">{item.packageName}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">₹{item.amountPaid}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{item.pointsToCredit.toLocaleString()}</td>
                    <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{new Date(item.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
