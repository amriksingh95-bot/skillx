import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import DataTable from '../../components/DataTable';
import Badge from '../../components/Badge';
import { Download, Calendar, FileSpreadsheet, RefreshCw, CreditCard, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

export default function AdminReports() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [reportType, setReportType] = useState('daily');
  const [queryDate, setQueryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [queryYear, setQueryYear] = useState(() => new Date().getFullYear().toString());
  const [queryMonth, setQueryMonth] = useState(() => (new Date().getMonth() + 1).toString());

  const [reportStats, setReportStats] = useState(null);
  const [reportTransactions, setReportTransactions] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(null);

  const [liabilityData, setLiabilityData] = useState(null);
  const [liabilityLoading, setLiabilityLoading] = useState(false);

  const [merchantHealth, setMerchantHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const fetchReportStats = async () => {
    setIsLoading(true);
    try {
      let url = '';
      if (reportType === 'daily') {
        url = `/api/admin/reports/daily?date=${queryDate}`;
      } else {
        url = `/api/admin/reports/monthly?year=${queryYear}&month=${queryMonth}`;
      }
      const res = await api.get(url);
      setReportStats(res.data.data);
    } catch (err) {
      toast.error('Failed to load report summary statistics.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTransactionsRange = async () => {
    try {
      const res = await api.get(`/api/admin/transactions?page=${page}&limit=10&startDate=${startDate}&endDate=${endDate}`);
      setReportTransactions(res.data.data.transactions);
      setPagination(res.data.data.pagination);
    } catch (err) {
      toast.error('Failed to load report transactions list.');
    }
  };

  const fetchLiabilityTrend = async () => {
    setLiabilityLoading(true);
    try {
      const res = await api.get('/api/admin/reports/points-liability-trend');
      setLiabilityData(res.data.data);
    } catch (err) {
      toast.error('Failed to load points liability trend.');
    } finally {
      setLiabilityLoading(false);
    }
  };

  const fetchMerchantHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await api.get('/api/admin/reports/merchant-health');
      setMerchantHealth(res.data.data);
    } catch (err) {
      toast.error('Failed to load merchant health.');
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    fetchReportStats();
  }, [reportType, queryDate, queryYear, queryMonth]);

  useEffect(() => {
    fetchTransactionsRange();
  }, [page, startDate, endDate]);

  useEffect(() => {
    fetchLiabilityTrend();
    fetchMerchantHealth();
  }, []);

  const handleExport = async (format) => {
    setIsExporting(format);
    try {
      const res = await api.get(`/api/admin/reports/export?format=${format}&startDate=${startDate}&endDate=${endDate}`, {
        responseType: 'blob'
      });
      
      const fileExtension = format === 'excel' ? 'xlsx' : 'csv';
      const contentType = format === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv';

      const blob = new Blob([res.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions_report_${startDate}_to_${endDate}.${fileExtension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} export complete.`);
    } catch (err) {
      toast.error('Failed to export report.');
    } finally {
      setIsExporting(null);
    }
  };

  const columns = [
    {
      header: 'Date',
      accessor: 'createdAt',
      render: (row) => new Date(row.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    },
    {
      header: 'Customer Mobile',
      accessor: (row) => row.customer?.user?.mobile || row.customer?.mobile || 'N/A'
    },
    {
      header: 'Merchant Outlet',
      accessor: (row) => row.merchant?.businessName || 'N/A'
    },
    {
      header: 'Type',
      accessor: 'type',
      render: (row) => <Badge type={row.type}>{row.type}</Badge>
    },
    {
      header: 'Purchase Amt',
      accessor: 'purchaseAmount',
      render: (row) => row.purchaseAmount ? `₹${parseFloat(row.purchaseAmount).toLocaleString('en-IN')}` : '-'
    },
    {
      header: 'Points',
      accessor: 'points',
      render: (row) => (
        <span className={`font-bold ${row.type === 'earn' ? 'text-emerald-600' : 'text-rose-500'}`}>
          {row.type === 'earn' ? '+' : '-'}{row.points}
        </span>
      )
    },
    {
      header: 'Fee',
      accessor: 'platformFee',
      render: (row) => {
        if (row.type !== 'redeem' || !row.platformFee) return <span className="text-slate-400">-</span>;
        return (
            <span className="text-xs font-bold text-amber-500">
            ₹{parseFloat(row.platformFee).toLocaleString('en-IN')}
          </span>
        );
      }
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <Badge type={row.status}>{row.status}</Badge>
    }
  ];

  const healthColumns = [
    {
      header: 'Merchant',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-800 dark:text-white">{row.businessName}</span>
          <span className="block text-xs text-slate-400 mt-0.5">{row.category}</span>
        </div>
      )
    },
    {
      header: 'Tier',
      accessor: 'tier',
      render: (row) => {
        const colors = {
          critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800',
          warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
          healthy: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
        };
        return (
          <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full capitalize ${colors[row.tier]}`}>
            {row.tier}
          </span>
        );
      }
    },
    {
      header: 'Last Tx',
      render: (row) => {
        if (!row.metrics.lastTransactionDate) return <span className="text-slate-400">Never</span>;
        const days = row.metrics.daysSinceLastTx;
        return (
          <div>
            <span className="text-sm">{new Date(row.metrics.lastTransactionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
            <span className={`block text-xs font-bold ${days >= 30 ? 'text-red-500' : days >= 14 ? 'text-amber-500' : 'text-slate-400'}`}>
              {days}d ago
            </span>
          </div>
        );
      }
    },
    {
      header: 'Volume Change',
      render: (row) => {
        const { thisMonthTxCount, lastMonthTxCount, volumeDropPercent } = row.metrics;
        if (lastMonthTxCount === 0) return <span className="text-slate-400 text-xs">N/A</span>;
        const isDrop = volumeDropPercent > 0;
        return (
          <div className="text-xs">
            <span className={isDrop ? 'text-red-500 font-bold' : 'text-emerald-600 font-bold'}>
              {isDrop ? `-${volumeDropPercent}%` : `+${Math.round(((thisMonthTxCount - lastMonthTxCount) / lastMonthTxCount) * 100)}%`}
            </span>
            <span className="block text-slate-400 mt-0.5">{lastMonthTxCount} ? {thisMonthTxCount} txs</span>
          </div>
        );
      }
    },
    {
      header: 'Top-Ups',
      render: (row) => {
        const { failedTopUps, lateTopUps } = row.metrics;
        if (failedTopUps === 0 && lateTopUps === 0) return <span className="text-xs text-slate-400">—</span>;
        return (
          <div className="text-xs space-y-0.5">
            {failedTopUps > 0 && <div className="text-red-500 font-bold">{failedTopUps} failed</div>}
            {lateTopUps > 0 && <div className="text-amber-500 font-bold">{lateTopUps} late</div>}
          </div>
        );
      }
    },
    {
      header: 'Subscription',
      render: (row) => {
        const { subscriptionEndDate, subscriptionStatus, subscriptionExpiringInDays } = row.metrics;
        if (!subscriptionEndDate) return <span className="text-xs text-slate-400">None</span>;
        const expiringSoon = subscriptionExpiringInDays !== null && subscriptionExpiringInDays <= 7 && subscriptionExpiringInDays >= 0;
        return (
          <div className="text-xs">
            <Badge type={subscriptionStatus}>{subscriptionStatus?.replace('_', ' ')}</Badge>
            <span className={`block mt-1 ${expiringSoon ? 'text-amber-500 font-bold' : 'text-slate-400'}`}>
              {new Date(subscriptionEndDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              {expiringSoon && ` (${subscriptionExpiringInDays}d)`}
            </span>
          </div>
        );
      }
    },
    {
      header: 'Flags',
      render: (row) => {
        if (row.flags.length === 0) return <span className="text-xs text-emerald-500">None</span>;
        return (
          <div className="space-y-1">
            {row.flags.map((f, i) => (
              <div key={i} className="text-xs text-slate-600 dark:text-slate-300 leading-tight">{f.detail}</div>
            ))}
          </div>
        );
      }
    }
  ];

  const liabilityChartData = liabilityData?.weeks?.map(w => ({
    ...w,
    label: new Date(w.weekEnd).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  })) || [];

  const tierIcon = (tier) => {
    if (tier === 'critical') return <XCircle className="w-4 h-4" />;
    if (tier === 'warning') return <AlertTriangle className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white">Reports & Exports</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Compile periodic platform summaries and generate spreadsheet exports.
        </p>
      </div>

      {/* Grid: 1. Stats scope, 2. Export dates */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left pane: Query scope and cards */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-base text-slate-800 dark:text-white">Summary Queries</h3>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  onClick={() => setReportType('daily')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    reportType === 'daily' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400'
                  } btn-press`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setReportType('monthly')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    reportType === 'monthly' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400'
                  } btn-press`}
                >
                  Monthly
                </button>
              </div>
            </div>

            {/* Inputs based on type */}
            {reportType === 'daily' ? (
              <div className="flex items-center gap-3 w-full sm:max-w-sm">
                <Calendar className="w-5 h-5 text-slate-400 shrink-0" />
                <input
                  type="date"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm dark:text-slate-100"
                  value={queryDate}
                  onChange={(e) => setQueryDate(e.target.value)}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 w-full sm:max-w-sm">
                <select
                  className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm"
                  value={queryYear}
                  onChange={(e) => setQueryYear(e.target.value)}
                >
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                </select>
                <select
                  className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm capitalize"
                  value={queryMonth}
                  onChange={(e) => setQueryMonth(e.target.value)}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {new Date(2020, m - 1).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Summarized metric cards */}
            {reportStats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Transactions</span>
                  <span className="text-xl font-black text-slate-800 dark:text-white block mt-1">
                    {reportStats.transactionsCount} txs
                  </span>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Volume Processed</span>
                  <span className="text-xl font-black text-slate-800 dark:text-white block mt-1">
                    ₹{reportStats.purchaseAmountProcessed.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Points Issued</span>
                  <span className="text-xl font-black text-emerald-600 block mt-1">
                    +{reportStats.pointsIssued.toLocaleString('en-IN')} pts
                  </span>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Points Redeemed</span>
                  <span className="text-xl font-black text-amber-500 block mt-1">
                    -{reportStats.pointsRedeemed.toLocaleString('en-IN')} pts
                  </span>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Platform Fee Collected</span>
                  <span className="text-xl font-black text-primary block mt-1">
                    ₹{(reportStats.platformFeeCollected || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right pane: Range export */}
        <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-3xl p-6 shadow-sm space-y-6">
          <h3 className="font-bold text-base text-slate-800 dark:text-white">Export Raw Logs</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">From Date</label>
              <input
                type="date"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm dark:text-slate-100"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">To Date</label>
              <input
                type="date"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm dark:text-slate-100"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => handleExport('excel')}
              disabled={isExporting !== null}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-500/10 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 btn-press"
            >
              {isExporting === 'excel' ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              Export Excel
            </button>
            <button
              onClick={() => handleExport('csv')}
              disabled={isExporting !== null}
              className="w-full py-3 border border-slate-200 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 btn-press"
            >
              {isExporting === 'csv' ? (
                <span className="w-5 h-5 border-2 border-slate-400 border-t-transparent animate-spin rounded-full" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Points Liability Trend */}
      <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-base text-slate-800 dark:text-white">Points Liability Trend</h3>
            <p className="text-xs text-slate-400 mt-0.5">Weekly outstanding balance — last 12 weeks (issued - redeemed)</p>
          </div>
          <button
            onClick={fetchLiabilityTrend}
            disabled={liabilityLoading}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-all btn-press"
          >
            <RefreshCw className={`w-4 h-4 ${liabilityLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {liabilityData && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-slate-400">Current Outstanding</span>
                <span className="text-xl font-black text-slate-800 dark:text-white block mt-1">
                  {liabilityData.currentOutstanding.toLocaleString('en-IN')} pts
                </span>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Issued (12W)</span>
                <span className="text-xl font-black text-emerald-600 block mt-1">
                  +{liabilityData.summary.totalIssued12W.toLocaleString('en-IN')} pts
                </span>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Redeemed (12W)</span>
                <span className="text-xl font-black text-amber-500 block mt-1">
                  -{liabilityData.summary.totalRedeemed12W.toLocaleString('en-IN')} pts
                </span>
              </div>
            </div>

            {liabilityLoading ? (
              <div className="h-72 flex items-center justify-center">
                <span className="w-8 h-8 border-3 border-primary border-t-transparent animate-spin rounded-full" />
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={liabilityChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line
                      type="monotone"
                      dataKey="pointsIssued"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="Issued"
                      dot={{ r: 3, fill: '#10b981' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="pointsRedeemed"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      name="Redeemed"
                      dot={{ r: 3, fill: '#f59e0b' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="outstandingBalance"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      name="Outstanding"
                      dot={{ r: 4, fill: '#6366f1' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>

      {/* Merchant Health */}
      <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-base text-slate-800 dark:text-white">Merchant Health</h3>
            <p className="text-xs text-slate-400 mt-0.5">Active merchant tier classification — critical, warning, healthy</p>
          </div>
          <button
            onClick={fetchMerchantHealth}
            disabled={healthLoading}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-all btn-press"
          >
            <RefreshCw className={`w-4 h-4 ${healthLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {merchantHealth && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Active</span>
                <span className="text-xl font-black text-slate-800 dark:text-white block mt-1">
                  {merchantHealth.summary.totalMerchants}
                </span>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-900/30">
                <span className="text-[10px] uppercase font-bold text-red-400 flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> Critical
                </span>
                <span className="text-xl font-black text-red-600 dark:text-red-400 block mt-1">
                  {merchantHealth.summary.critical}
                </span>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                <span className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Warning
                </span>
                <span className="text-xl font-black text-amber-600 dark:text-amber-400 block mt-1">
                  {merchantHealth.summary.warning}
                </span>
              </div>
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Healthy
                </span>
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 block mt-1">
                  {merchantHealth.summary.healthy}
                </span>
              </div>
            </div>

            {healthLoading ? (
              <div className="h-40 flex items-center justify-center">
                <span className="w-8 h-8 border-3 border-primary border-t-transparent animate-spin rounded-full" />
              </div>
            ) : (
              <DataTable
                columns={healthColumns}
                data={merchantHealth.merchants}
                isLoading={false}
              />
            )}
          </>
        )}
      </div>

      {/* Range table visualization */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg text-slate-800 dark:text-white">Transactions in Date Range</h3>
        <DataTable
          columns={columns}
          data={reportTransactions}
          pagination={pagination}
          onPageChange={setPage}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
