import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import StatCard from '../../components/StatCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import { ArrowUpRight, ArrowDownLeft, Coins, RefreshCw, UserCheck, UserX, CreditCard, TrendingUp, Users, Gift } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

export default function MerchantReports() {
  const [data, setData] = useState(null);
  const [repeatData, setRepeatData] = useState(null);
  const [roiData, setRoiData] = useState(null);
  const [topCustomersData, setTopCustomersData] = useState(null);
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

  const fetchROI = async () => {
    try {
      const res = await api.get('/api/merchant/roi-report');
      setRoiData(res.data.data);
    } catch (err) {
      toast.error('Failed to load ROI report.');
    }
  };

  const fetchTopCustomers = async () => {
    try {
      const res = await api.get('/api/merchant/top-customers');
      setTopCustomersData(res.data.data);
    } catch (err) {
      toast.error('Failed to load top customers report.');
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchHealth(), fetchRepeatCustomers(), fetchROI(), fetchTopCustomers()]);
      setLoading(false);
    };
    init();
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    await Promise.all([fetchHealth(), fetchRepeatCustomers(), fetchROI(), fetchTopCustomers()]);
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
          icon={Coins}
          label="Points in Circulation"
          value={(data?.pointsLiability || 0).toLocaleString('en-IN')}
          color="info"
        />
      </div>

      {/* Shared Network Note */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
        <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
          Since SkillXT is a shared network, customers can redeem points at any partner merchant — issued and redeemed numbers don't need to match.
        </p>
      </div>

      {/* Explanatory Note */}
      <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">About This Report</h3>
        <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
          <li><span className="font-semibold text-slate-600 dark:text-slate-300">Points Issued:</span> Total points credited to customers via purchases and transfers (excluding reversed transactions).</li>
          <li><span className="font-semibold text-slate-600 dark:text-slate-300">Points Redeemed:</span> Total points used by customers for discounts (excluding reversed transactions).</li>
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

      {/* Merchant ROI Report */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">Merchant ROI Report (All-Time)</h2>

        {/* Cost Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <StatCard
            icon={CreditCard}
            label="Total Spent on SkillXT"
            value={`₹${(roiData?.cost.totalSpent || 0).toLocaleString('en-IN')}`}
            color="danger"
          />
          <StatCard
            icon={Coins}
            label="Subscription vs Top-Ups"
            value={`₹${(roiData?.cost.subscriptionTotal || 0).toLocaleString('en-IN')} / ₹${(roiData?.cost.topUpTotal || 0).toLocaleString('en-IN')}`}
            color="info"
          />
        </div>

        {/* Impact Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <StatCard
            icon={TrendingUp}
            label="Total Sales Volume"
            value={`₹${(roiData?.impact.totalSalesVolume || 0).toLocaleString('en-IN')}`}
            color="success"
          />
          <StatCard
            icon={Users}
            label="Unique Customers Served"
            value={(roiData?.impact.uniqueCustomers || 0).toLocaleString('en-IN')}
            color="primary"
          />
        </div>

        {/* Avg Bill Value Trend Chart */}
        {roiData && roiData.impact.avgBillTrend.length > 0 && (
          <div className="mt-6 bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Average Bill Value Trend (Last 90 Days)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={roiData.impact.avgBillTrend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                    formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Avg Bill Value']}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgBillValue"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    name="Avg Bill Value"
                    dot={{ r: 4, fill: '#6366f1' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Loyalty Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <StatCard
            icon={Gift}
            label="Total Discounts Given to Customers"
            value={`₹${(roiData?.loyalty.totalDiscountsGiven || 0).toLocaleString('en-IN')}`}
            color="warning"
          />
          <StatCard
            icon={ArrowUpRight}
            label="Points Issued (All Time)"
            value={(roiData?.loyalty.pointsIssued || 0).toLocaleString('en-IN')}
            color="success"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <StatCard
            icon={ArrowDownLeft}
            label="Points Redeemed (All Time)"
            value={(roiData?.loyalty.pointsRedeemed || 0).toLocaleString('en-IN')}
            color="warning"
          />
        </div>

        {/* Shared Network Note */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 mt-4">
          <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
            Since SkillXT is a shared network, customers can redeem points at any partner merchant — issued and redeemed numbers don't need to match.
          </p>
        </div>
      </div>

      {/* Top Customers Report */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">Top Customers Report</h2>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <StatCard
            icon={Users}
            label="Total Top Customers"
            value={(topCustomersData?.summary.totalTopCustomers || 0).toLocaleString('en-IN')}
            color="primary"
          />
          <StatCard
            icon={TrendingUp}
            label="Revenue from Top Customers"
            value={`₹${(topCustomersData?.summary.revenueFromTopCustomers || 0).toLocaleString('en-IN')}`}
            color="success"
          />
          <StatCard
            icon={Coins}
            label="Average Spend"
            value={`₹${(topCustomersData?.summary.averageSpend || 0).toLocaleString('en-IN')}`}
            color="info"
          />
          <StatCard
            icon={UserCheck}
            label="Active Customers (Last 30 Days)"
            value={(topCustomersData?.summary.activeCustomersLast30Days || 0).toLocaleString('en-IN')}
            color="warning"
          />
        </div>

        {/* Top Customers Table */}
        {topCustomersData && topCustomersData.customers.length > 0 && (
          <div className="mt-4 bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-dark-border">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Top Customers by Revenue</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-dark-border">
                    <th className="px-5 py-3 text-center">#</th>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Mobile</th>
                    <th className="px-5 py-3 text-right">Total Spent</th>
                    <th className="px-5 py-3 text-center">Orders</th>
                    <th className="px-5 py-3 text-right">Avg Order Value</th>
                    <th className="px-5 py-3 text-right">Points Earned</th>
                    <th className="px-5 py-3 text-right">Points Redeemed</th>
                    <th className="px-5 py-3 text-right">Revenue Contribution</th>
                    <th className="px-5 py-3">Last Purchase</th>
                    <th className="px-5 py-3">Join Date</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-dark-border">
                  {topCustomersData.customers.map((customer) => (
                    <tr key={customer.rank} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-3 text-center">
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{customer.rank}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-800 dark:text-white">{customer.name}</span>
                          {customer.totalSpent >= 100000 && <span title="Platinum" className="text-xs">🥇</span>}
                          {customer.totalSpent >= 50000 && customer.totalSpent < 100000 && <span title="Gold" className="text-xs">🥈</span>}
                          {customer.totalSpent >= 20000 && customer.totalSpent < 50000 && <span title="Silver" className="text-xs">🥉</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm text-slate-500 dark:text-slate-400">{customer.mobile || '—'}</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-sm font-semibold text-slate-800 dark:text-white">₹{customer.totalSpent.toLocaleString('en-IN')}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
                          {customer.orders}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-sm text-slate-600 dark:text-slate-300">₹{customer.avgOrderValue.toLocaleString('en-IN')}</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-sm text-success">{customer.pointsEarned.toLocaleString('en-IN')}</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-sm text-warning">{customer.pointsRedeemed.toLocaleString('en-IN')}</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{customer.revenueContributionPct}%</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          {customer.lastPurchase
                            ? new Date(customer.lastPurchase).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                            : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          {customer.joinDate
                            ? new Date(customer.joinDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                            : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          customer.status === 'active'
                            ? 'bg-success/10 text-success'
                            : 'bg-danger/10 text-danger'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${customer.status === 'active' ? 'bg-success' : 'bg-danger'}`} />
                          {customer.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {topCustomersData && topCustomersData.customers.length === 0 && (
          <div className="mt-4 bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-2xl p-8 text-center shadow-sm">
            <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No customer data available yet.</p>
          </div>
        )}

        {/* Charts Row */}
        {topCustomersData && topCustomersData.customers.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            {/* Bar Chart: Top 10 by Total Spent */}
            <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Top 10 Customers by Revenue</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topCustomersData.customers.slice(0, 10)}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      stroke="#94a3b8"
                      width={90}
                      tickFormatter={(v) => v.length > 12 ? v.slice(0, 12) + '…' : v}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                      formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Total Spent']}
                    />
                    <Bar dataKey="totalSpent" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart: Revenue Contribution — Top 10 vs Rest */}
            <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Revenue Contribution — Top 10 vs Rest</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={(() => {
                        const top10 = topCustomersData.customers.slice(0, 10);
                        const restTotal = topCustomersData.customers
                          .slice(10)
                          .reduce((sum, c) => sum + c.totalSpent, 0);
                        const slices = top10.map((c) => ({
                          name: c.name.length > 14 ? c.name.slice(0, 14) + '…' : c.name,
                          value: c.totalSpent,
                        }));
                        if (restTotal > 0) slices.push({ name: 'Rest', value: restTotal });
                        return slices;
                      })()}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {(() => {
                        const top10Count = Math.min(topCustomersData.customers.length, 10);
                        const hasRest = topCustomersData.customers.length > 10;
                        const sliceCount = hasRest ? top10Count + 1 : top10Count;
                        const colors = [
                          '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4',
                          '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b', '#94a3b8',
                        ];
                        return Array.from({ length: sliceCount }, (_, i) => (
                          <Cell key={i} fill={colors[i % colors.length]} />
                        ));
                      })()}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                      formatter={(value, name) => [`₹${value.toLocaleString('en-IN')}`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-2 justify-center">
                {topCustomersData.customers.slice(0, 10).map((c, i) => {
                  const colors = [
                    '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4',
                    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b',
                  ];
                  return (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colors[i] }} />
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[80px]">{c.name}</span>
                    </div>
                  );
                })}
                {topCustomersData.customers.length > 10 && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-slate-400" />
                    <span className="text-xs text-slate-500 dark:text-slate-400">Rest</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
