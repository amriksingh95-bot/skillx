import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Badge from '../../components/Badge';
import { RefreshCw, Users, Store, AlertTriangle, AlertCircle, CheckCircle, Clock, TrendingDown, Shield, Activity, Calendar, Zap, AlertOctagon, CheckSquare } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  active: { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', label: 'Active', icon: CheckCircle },
  at_risk: { color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30', label: 'At Risk', icon: AlertCircle },
  inactive: { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', label: 'Inactive', icon: AlertTriangle },
  dormant: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', label: 'Dormant', icon: Shield }
};

export default function AdminInactivityMonitor() {
  const [summary, setSummary] = useState(null);
  const [merchantReport, setMerchantReport] = useState(null);
  const [customerReport, setCustomerReport] = useState(null);
  const [activeTab, setActiveTab] = useState('merchants');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  const fetchSummary = async () => {
    try {
      const res = await api.get('/api/admin/inactivity/summary');
      setSummary(res.data.data);
    } catch (err) {
      toast.error('Failed to load inactivity summary.');
    }
  };

  const fetchMerchantReport = async () => {
    setIsLoadingReport(true);
    try {
      const res = await api.get('/api/admin/inactivity/merchants');
      setMerchantReport(res.data.data);
    } catch (err) {
      toast.error('Failed to load merchant inactivity report.');
    } finally {
      setIsLoadingReport(false);
    }
  };

  const fetchCustomerReport = async () => {
    setIsLoadingReport(true);
    try {
      const res = await api.get('/api/admin/inactivity/customers');
      setCustomerReport(res.data.data);
    } catch (err) {
      toast.error('Failed to load customer inactivity report.');
    } finally {
      setIsLoadingReport(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await fetchSummary();
      setIsLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (activeTab === 'merchants' && !merchantReport) {
      fetchMerchantReport();
    } else if (activeTab === 'customers' && !customerReport) {
      fetchCustomerReport();
    }
  }, [activeTab]);

  const handleRefresh = async () => {
    setIsLoading(true);
    setMerchantReport(null);
    setCustomerReport(null);
    await fetchSummary();
    if (activeTab === 'merchants') {
      await fetchMerchantReport();
    } else {
      await fetchCustomerReport();
    }
    setIsLoading(false);
    toast.success('Reports refreshed!');
  };

  const formatDate = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getDaysBadge = (days, label) => {
    if (days === null || days === undefined) {
      return <span className="text-xs font-semibold text-slate-400">No data</span>;
    }

    let colorClass = 'text-slate-600 dark:text-slate-300';
    let bgColor = 'bg-slate-100 dark:bg-slate-800';

    if (days <= 30) {
      colorClass = 'text-emerald-600 dark:text-emerald-400';
      bgColor = 'bg-emerald-100 dark:bg-emerald-900/30';
    } else if (days <= 60) {
      colorClass = 'text-yellow-600 dark:text-yellow-400';
      bgColor = 'bg-yellow-100 dark:bg-yellow-900/30';
    } else if (days <= 90) {
      colorClass = 'text-amber-600 dark:text-amber-400';
      bgColor = 'bg-amber-100 dark:bg-amber-900/30';
    } else {
      colorClass = 'text-red-600 dark:text-red-400';
      bgColor = 'bg-red-100 dark:bg-red-900/30';
    }

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${bgColor} ${colorClass}`}>
        {days}d
      </span>
    );
  };

  const getChurnSignalBadges = (signals) => {
    if (!signals) return null;
    const badges = [];
    if (signals.pointsNeverRedeemed) {
      badges.push(
        <span key="never" className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
          <Zap className="w-2.5 h-2.5" /> Never Redeemed
        </span>
      );
    }
    if (signals.highBalanceNoRedemption) {
      badges.push(
        <span key="high" className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
          <AlertOctagon className="w-2.5 h-2.5" /> High Balance
        </span>
      );
    }
    if (signals.profileIncomplete) {
      badges.push(
        <span key="incomplete" className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400">
          <CheckSquare className="w-2.5 h-2.5" /> Profile {signals.profileCompleteness || 0}%
        </span>
      );
    }
    if (badges.length === 0) {
      return <span className="text-xs text-slate-400">No signals</span>;
    }
    return <div className="flex flex-wrap gap-1">{badges}</div>;
  };

  const getPointsBalanceBadge = (item) => {
    if (!item || item.currentBalance === undefined) return null;
    const balance = item.currentBalance || 0;
    const totalEarned = item.totalEarned || 0;
    const totalRedeemed = item.totalRedeemed || 0;
    return (
      <div className="text-xs">
        <span className="font-bold text-slate-800 dark:text-white">{balance.toLocaleString('en-IN')}</span>
        <span className="text-slate-400"> / </span>
        <span className="text-slate-500">{totalEarned.toLocaleString('en-IN')} earned</span>
      </div>
    );
  };

  const getStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.dormant;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${config.bg} ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const getFilteredData = (data, filter) => {
    if (!data) return [];
    if (!filter) return data;
    return data.filter(item => item.inactivityStatus === filter);
  };

  const renderMerchantTable = (merchants) => (
    <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-2xl shadow-sm overflow-hidden">
      <div className="hidden md:block w-full overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-dark-border">
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Merchant</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Last Login</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Last Transaction</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Last Redemption</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Days Inactive</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Customers</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Points Balance</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Subscription</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Churn Signals</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-dark-border text-slate-700 dark:text-slate-300">
            {merchants.length > 0 ? merchants.map((m) => (
              <tr key={m.merchantId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{m.businessName}</p>
                      <p className="text-xs text-slate-400">{m.category}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">{getStatusBadge(m.inactivityStatus)}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-sm">{formatDate(m.lastLoginAt)}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-sm">{formatDate(m.lastTransactionAt)}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-sm">{formatDate(m.lastRedemptionAt)}</span>
                  </div>
                </td>
                <td className="px-6 py-4">{getDaysBadge(m.daysSinceActivity, 'days')}</td>
                <td className="px-6 py-4">
                  <span className="text-sm font-bold text-slate-800 dark:text-white">{m.customerCount}</span>
                </td>
                <td className="px-6 py-4">{getPointsBalanceBadge(m)}</td>
                <td className="px-6 py-4">
                  {m.subscription ? (
                    <Badge type={m.subscription.status === 'active' ? 'active' : 'warning'}>
                      {m.subscription.planName} ({m.subscription.status})
                    </Badge>
                  ) : (
                    <span className="text-xs text-slate-400">None</span>
                  )}
                </td>
                <td className="px-6 py-4">{getChurnSignalBadges(m.churnSignals)}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center text-sm text-slate-400">No merchants found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden divide-y divide-slate-100 dark:divide-dark-border">
        {merchants.length > 0 ? merchants.map((m) => (
          <div key={m.merchantId} className="p-4 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mt-0.5">Merchant</span>
              <span className="text-sm font-semibold text-slate-800 dark:text-white text-right">{m.businessName}</span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mt-0.5">Status</span>
              {getStatusBadge(m.inactivityStatus)}
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mt-0.5">Last Login</span>
              <span className="text-xs text-slate-600 dark:text-slate-300">{formatDate(m.lastLoginAt)}</span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mt-0.5">Last Transaction</span>
              <span className="text-xs text-slate-600 dark:text-slate-300">{formatDate(m.lastTransactionAt)}</span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mt-0.5">Days Inactive</span>
              {getDaysBadge(m.daysSinceActivity, 'days')}
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mt-0.5">Customers</span>
              <span className="text-sm font-bold text-slate-800 dark:text-white">{m.customerCount}</span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mt-0.5">Churn Signals</span>
              {getChurnSignalBadges(m.churnSignals)}
            </div>
          </div>
        )) : (
          <div className="px-6 py-12 text-center text-sm text-slate-400">No merchants found.</div>
        )}
      </div>
    </div>
  );

  const renderCustomerTable = (customers) => (
    <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-2xl shadow-sm overflow-hidden">
      <div className="hidden md:block w-full overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-dark-border">
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Customer</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Last Login</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Last Transaction</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Last Redemption</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Days Inactive</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">City</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Points Balance</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Churn Signals</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-dark-border text-slate-700 dark:text-slate-300">
            {customers.length > 0 ? customers.map((c) => (
              <tr key={c.customerId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{c.name}</p>
                      <p className="text-xs text-slate-400">{c.email || 'No email'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">{getStatusBadge(c.inactivityStatus)}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-sm">{formatDate(c.lastLoginAt)}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-sm">{formatDate(c.lastTransactionAt)}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-sm">{formatDate(c.lastRedemptionAt)}</span>
                  </div>
                </td>
                <td className="px-6 py-4">{getDaysBadge(c.daysSinceActivity, 'days')}</td>
                <td className="px-6 py-4">
                  <span className="text-sm text-slate-600 dark:text-slate-300">{c.city || '-'}</span>
                </td>
                <td className="px-6 py-4">{getPointsBalanceBadge(c)}</td>
                <td className="px-6 py-4">{getChurnSignalBadges(c.churnSignals)}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-sm text-slate-400">No customers found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden divide-y divide-slate-100 dark:divide-dark-border">
        {customers.length > 0 ? customers.map((c) => (
          <div key={c.customerId} className="p-4 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mt-0.5">Customer</span>
              <span className="text-sm font-semibold text-slate-800 dark:text-white text-right">{c.name}</span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mt-0.5">Status</span>
              {getStatusBadge(c.inactivityStatus)}
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mt-0.5">Last Login</span>
              <span className="text-xs text-slate-600 dark:text-slate-300">{formatDate(c.lastLoginAt)}</span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mt-0.5">Last Transaction</span>
              <span className="text-xs text-slate-600 dark:text-slate-300">{formatDate(c.lastTransactionAt)}</span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mt-0.5">Days Inactive</span>
              {getDaysBadge(c.daysSinceActivity, 'days')}
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mt-0.5">Churn Signals</span>
              {getChurnSignalBadges(c.churnSignals)}
            </div>
          </div>
        )) : (
          <div className="px-6 py-12 text-center text-sm text-slate-400">No customers found.</div>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <span className="w-10 h-10 border-4 border-primary border-t-transparent animate-spin rounded-full" />
        <p className="text-xs font-bold text-slate-400 mt-3">Loading inactivity data...</p>
      </div>
    );
  }

  const currentReport = activeTab === 'merchants' ? merchantReport : customerReport;
  const currentData = currentReport ? (activeTab === 'merchants' ? currentReport.merchants : currentReport.customers) : [];
  const filteredData = getFilteredData(currentData, statusFilter);
  const currentSummary = activeTab === 'merchants' ? summary?.merchants : summary?.customers;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">Inactivity Monitor</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track merchant and customer engagement levels. Identify at-risk and dormant accounts.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoadingReport}
          className="p-3 bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm flex items-center justify-center gap-2 text-sm font-semibold btn-press"
        >
          <RefreshCw className={`w-4 h-4 ${isLoadingReport ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: currentSummary?.total || 0, icon: Users, color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-800', filter: '' },
            { label: 'Active (=30d)', value: currentSummary?.active || 0, icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', filter: 'active' },
            { label: 'At Risk (31-60d)', value: currentSummary?.atRisk || 0, icon: AlertCircle, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30', filter: 'at_risk' },
            { label: 'Inactive (61-90d)', value: currentSummary?.inactive || 0, icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', filter: 'inactive' },
            { label: 'Dormant (>90d)', value: currentSummary?.dormant || 0, icon: Shield, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', filter: 'dormant' }
          ].map((card, idx) => {
            const Icon = card.icon;
            return (
              <button
                key={idx}
                onClick={() => setStatusFilter(card.filter)}
                className={`bg-white dark:bg-dark-card border rounded-xl p-4 text-left hover:shadow-md transition-all ${
                  statusFilter === card.filter
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-slate-100 dark:border-dark-border'
                } btn-press`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-lg ${card.bg}`}>
                    <Icon className={`w-4 h-4 ${card.color}`} />
                  </div>
                </div>
                <p className="text-2xl font-black text-slate-800 dark:text-white">{card.value}</p>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{card.label}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        {[
          { value: 'merchants', label: 'Merchants', icon: Store },
          { value: 'customers', label: 'Customers', icon: Users }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === tab.value
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
              } btn-press`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
        {statusFilter && (
          <button
            onClick={() => setStatusFilter('')}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-all flex items-center gap-1 btn-press"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Report Table */}
      {isLoadingReport ? (
        <div className="flex flex-col items-center justify-center py-12">
          <span className="w-8 h-8 border-4 border-primary border-t-transparent animate-spin rounded-full" />
          <p className="text-xs font-bold text-slate-400 mt-2">Loading report...</p>
        </div>
      ) : activeTab === 'merchants' ? (
        renderMerchantTable(filteredData)
      ) : (
        renderCustomerTable(filteredData)
      )}
    </div>
  );
}
