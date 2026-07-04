import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Users,
  Store,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  CreditCard,
  AlertTriangle,
  BarChart3,
  Activity,
  Clock
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import StatCard from '../../components/StatCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import AdBanner from '../../components/AdBanner';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [trends, setTrends] = useState(null);
  const [retention, setRetention] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/api/admin/dashboard');
      setData(res.data.data);
    } catch (err) {
      toast.error('Failed to load administrative dashboard statistics.');
    }
  };

  const fetchPendingCount = async () => {
    try {
      const res = await api.get('/api/admin/merchants?page=1&limit=50');
      const merchants = res.data.data.merchants || [];
      const count = merchants.filter(m => m.status === 'pending').length;
      setPendingCount(count);
    } catch (err) {
      // Silent
    }
  };

  const fetchTrends = async () => {
    try {
      const res = await api.get('/api/admin/trends');
      setTrends(res.data.data);
    } catch (err) {
      // Silent
    }
  };

  const fetchRetention = async () => {
    try {
      const res = await api.get('/api/admin/retention');
      setRetention(res.data.data);
    } catch (err) {
      // Silent
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await Promise.all([fetchDashboardData(), fetchTrends(), fetchRetention()]);
    setLoading(false);
    toast.success('Admin metrics updated!');
  };

  useEffect(() => {
    const initData = async () => {
      await Promise.all([fetchDashboardData(), fetchTrends(), fetchRetention(), fetchPendingCount()]);
      setLoading(false);
    };
    initData();
  }, []);

  if (loading) return <LoadingSpinner size="large" fullPage />;

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-dark-card rounded-3xl border border-slate-100 dark:border-dark-border">
        <p className="text-slate-500 dark:text-slate-400 mb-4 font-semibold">Failed to retrieve administrative dashboard metrics.</p>
        <button
          onClick={handleRefresh}
          className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20 hover:shadow-lg transition-all"
        >
          Retry Loading
        </button>
      </div>
    );
  }

  const { cards, charts, declineAlerts } = data;

  return (
    <div className="space-y-6">
      <AdBanner />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">Admin Headquarters</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Global system insights, points ledger audit statistics, and network liability.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="p-3 bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm flex items-center justify-center gap-2 text-sm font-semibold"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Users}
          label="Total Customers"
          value={cards.totalCustomers}
          trend={{ type: 'up', value: `${cards.activeCustomers} Active` }}
        />
        <StatCard
          icon={Store}
          label="Total Merchants"
          value={cards.totalMerchants}
          trend={{ type: 'up', value: `${cards.activeMerchants} Active` }}
        />
        <StatCard
          icon={Clock}
          label="Pending Approvals"
          value={pendingCount}
          trend={{ type: 'down', value: 'Awaiting review' }}
          color="warning"
        />
        <StatCard
          icon={Layers}
          label="Transactions Processed"
          value={cards.totalTransactions}
        />
        <StatCard
          icon={DollarSign}
          label="Reward Liability"
          value={`₹${cards.liability.toLocaleString('en-IN')}`}
          trend={{ type: 'down', value: 'Outstanding' }}
        />
        <StatCard
          icon={ArrowUpRight}
          label="Total Points Issued"
          value={cards.pointsIssued.toLocaleString('en-IN')}
        />
        <StatCard
          icon={ArrowDownLeft}
          label="Total Points Redeemed"
          value={cards.pointsRedeemed.toLocaleString('en-IN')}
        />
        <StatCard
          icon={TrendingUp}
          label="Outstanding Balance"
          value={(cards.pointsIssued - cards.pointsRedeemed).toLocaleString('en-IN')}
        />
        <StatCard
          icon={CreditCard}
          label="Platform Fee Revenue (Total)"
          value={`₹${(cards.totalFeeRevenue || 0).toLocaleString('en-IN')}`}
          trend={{ type: 'up', value: 'All Time' }}
        />
        <StatCard
          icon={CreditCard}
          label="Fee Revenue (This Month)"
          value={`₹${(cards.feeRevenueThisMonth || 0).toLocaleString('en-IN')}`}
          trend={{ type: 'up', value: 'Current Month' }}
        />
        <StatCard
          icon={CreditCard}
          label="Fee Revenue (Last Month)"
          value={`₹${(cards.feeRevenueLastMonth || 0).toLocaleString('en-IN')}`}
          trend={{ type: 'down', value: 'Previous Month' }}
        />
      </div>

      {/* Decline Alerts */}
      {declineAlerts && declineAlerts.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <h3 className="font-bold text-sm text-red-800 dark:text-red-300">Revenue Decline Alerts</h3>
          </div>
          <div className="space-y-2">
            {declineAlerts.map((alert, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-red-700 dark:text-red-300">{alert.message}</span>
                <span className="font-bold text-red-600 dark:text-red-400">{alert.change > 0 ? '+' : ''}{alert.change}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trend Comparison Cards */}
      {trends && trends.transactions && trends.transactions.weekOverWeek && (() => {
        const wow = trends.transactions.weekOverWeek;
        const weekItems = [
          {
            label: 'Transactions',
            current: wow.thisWeek.transactionCount || 0,
            previous: wow.lastWeek.transactionCount || 0,
            changePercent: wow.changes.transactionCount?.change || 0
          },
          {
            label: 'Volume (₹)',
            current: parseFloat(wow.thisWeek.volume || 0),
            previous: parseFloat(wow.lastWeek.volume || 0),
            changePercent: wow.changes.volume?.change || 0
          },
          {
            label: 'Unique Customers',
            current: wow.thisWeek.uniqueCustomers || 0,
            previous: wow.lastWeek.uniqueCustomers || 0,
            changePercent: wow.changes.uniqueCustomers?.change || 0
          }
        ];
        return (
          <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-base text-slate-800 dark:text-white">Weekly Trend Comparison</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {weekItems.map((item, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{item.label}</p>
                  <div className="flex items-end gap-2">
                    <span className="text-lg font-black text-slate-800 dark:text-white">{Number(item.current).toLocaleString('en-IN')}</span>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded mb-0.5 ${
                      item.changePercent > 0
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : item.changePercent < 0
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}>
                      {item.changePercent > 0 ? '+' : ''}{item.changePercent.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">vs last week ({Number(item.previous).toLocaleString('en-IN')})</p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Retention Metrics */}
      {retention && retention.customerRetention && (
        <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-secondary" />
            <h3 className="font-bold text-base text-slate-800 dark:text-white">Retention Metrics</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Customer Retention (30d)</p>
              <span className="text-xl font-black text-secondary">{retention.customerRetention.retentionRate ?? 0}%</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Merchant Retention (30d)</p>
              <span className="text-xl font-black text-secondary">{retention.merchantRetention?.retentionRate ?? 0}%</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Repeat Purchase Rate</p>
              <span className="text-xl font-black text-primary">{retention.repeatPurchase?.repeatPurchaseRate ?? 0}%</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Customer Churn Rate</p>
              <span className="text-xl font-black text-slate-800 dark:text-white">{retention.customerRetention?.churnRate ?? 0}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Points LineChart */}
        <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-3xl p-6 shadow-sm">
          <h3 className="font-bold text-base text-slate-800 dark:text-white mb-6">Points Issued vs Redeemed (Last 30 Days)</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.pointsIssuedVsRedeemed}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:hidden" />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" className="hidden dark:block" />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    fontSize: '13px'
                  }}
                />
                <Legend iconType="circle" fontSize={12} wrapperStyle={{ paddingTop: '10px' }} />
                <Line type="monotone" dataKey="issued" name="Issued" stroke="#2563EB" strokeWidth={3} activeDot={{ r: 6 }} dot={false} />
                <Line type="monotone" dataKey="redeemed" name="Redeemed" stroke="#10B981" strokeWidth={3} activeDot={{ r: 6 }} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Merchants BarChart */}
        <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-3xl p-6 shadow-sm">
          <h3 className="font-bold text-base text-slate-800 dark:text-white mb-6">Top 7 Merchants by Activity</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.topMerchants}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:hidden" />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" className="hidden dark:block" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                 <Tooltip
                   contentStyle={{
                     borderRadius: '12px',
                     fontSize: '13px'
                   }}
                 />
                 <Bar dataKey="transactions" name="Transactions Count" fill="#2563EB" radius={[8, 8, 0, 0]} barSize={35} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Customer Growth LineChart */}
        <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-3xl p-6 shadow-sm lg:col-span-2">
          <h3 className="font-bold text-base text-slate-800 dark:text-white mb-6">Customer Growth Trend (Cumulative)</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.customerGrowth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:hidden" />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" className="hidden dark:block" />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    fontSize: '13px'
                  }}
                />
                <Line type="monotone" dataKey="count" name="Cumulative Customers" stroke="#6366F1" strokeWidth={3.5} activeDot={{ r: 6 }} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
