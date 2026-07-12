import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import StatCard from '../../components/StatCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import { ArrowUpRight, ArrowDownLeft, Percent, Coins, RefreshCw, UserCheck, UserX } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MerchantReports() {
  const [data, setData] = useState(null);
  const [repeatData, setRepeatData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      const res = await api.get('/api/merchant/points-health');
      setData(res.data.data);
    } catch (err) {
      toast.error('Failed to load points health report.');
    }
  };

  const fetchRepeatCustomers = async () => {
    try {
      const res = await api.get('/api/merchant/repeat-customers');
      setRepeatData(res.data.data);
    } catch (err) {
      toast.error('Failed to load repeat customer report.');
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchHealth(), fetchRepeatCustomers()]);
      setLoading(false);
    };
    init();
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    await Promise.all([fetchHealth(), fetchRepeatCustomers()]);
    setLoading(false);
    toast.success('Report updated!');
  };

  if (loading && !data) return <LoadingSpinner size="large" fullPage />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">Points Health Report</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            All-time points issued, redeemed, and currently in circulation for your business.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="p-3 bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm flex items-center justify-center gap-2 text-sm font-semibold shrink-0 btn-press disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          icon={ArrowUpRight}
          label="Points Issued (All Time)"
          value={(data?.pointsIssued || 0).toLocaleString('en-IN')}
          color="success"
        />
        <StatCard
          icon={ArrowDownLeft}
          label="Points Redeemed (All Time)"
          value={(data?.pointsRedeemed || 0).toLocaleString('en-IN')}
          color="warning"
        />
        <StatCard
          icon={Percent}
          label="Redemption Rate"
          value={`${data?.redemptionRate ?? 0}%`}
          color="primary"
        />
        <StatCard
          icon={Coins}
          label="Points in Circulation"
          value={(data?.pointsLiability || 0).toLocaleString('en-IN')}
          color="info"
        />
      </div>

      {/* Explanatory Note */}
      <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">About This Report</h3>
        <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
          <li><span className="font-semibold text-slate-600 dark:text-slate-300">Points Issued:</span> Total points credited to customers via purchases and transfers (excluding reversed transactions).</li>
          <li><span className="font-semibold text-slate-600 dark:text-slate-300">Points Redeemed:</span> Total points used by customers for discounts (excluding reversed transactions).</li>
          <li><span className="font-semibold text-slate-600 dark:text-slate-300">Redemption Rate:</span> Percentage of issued points that have been redeemed. A higher rate indicates active point usage.</li>
          <li><span className="font-semibold text-slate-600 dark:text-slate-300">Points in Circulation:</span> Points you've issued that customers haven't redeemed yet, anywhere in the SkillXT network. These were already paid for when issued — this number reflects program activity, not money owed.</li>
        </ul>
      </div>

      {/* Repeat Customer Report */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">Repeat Customer Report (Last 30 Days)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <StatCard
            icon={UserCheck}
            label="Repeat Customers"
            value={repeatData ? `${repeatData.summary.repeatCustomers} (${repeatData.summary.repeatRate}%)` : '0 (0%)'}
            color="success"
          />
          <StatCard
            icon={UserX}
            label="One-Time Customers"
            value={(repeatData?.summary.oneTimeCustomers || 0).toLocaleString('en-IN')}
            color="warning"
          />
        </div>

        {/* Top Repeat Customers Table */}
        {repeatData && repeatData.topRepeatCustomers.length > 0 && (
          <div className="mt-4 bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-dark-border">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Top Repeat Customers</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-dark-border">
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3 text-center">Visits</th>
                    <th className="px-5 py-3">Last Visit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-dark-border">
                  {repeatData.topRepeatCustomers.map((customer, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-3">
                        <span className="text-sm font-medium text-slate-800 dark:text-white">{customer.name}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-bold bg-success/10 text-success">
                          {customer.visitCount}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          {new Date(customer.lastVisit).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {repeatData && repeatData.topRepeatCustomers.length === 0 && (
          <div className="mt-4 bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-2xl p-8 text-center shadow-sm">
            <UserCheck className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No repeat customers in the last 30 days.</p>
          </div>
        )}
      </div>
    </div>
  );
}
