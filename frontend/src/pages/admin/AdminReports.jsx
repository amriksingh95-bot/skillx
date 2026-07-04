import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import DataTable from '../../components/DataTable';
import Badge from '../../components/Badge';
import { Download, Calendar, FileSpreadsheet, RefreshCw, CreditCard } from 'lucide-react';
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

  const [reportType, setReportType] = useState('daily'); // 'daily' or 'monthly'
  const [queryDate, setQueryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [queryYear, setQueryYear] = useState(() => new Date().getFullYear().toString());
  const [queryMonth, setQueryMonth] = useState(() => (new Date().getMonth() + 1).toString());

  const [reportStats, setReportStats] = useState(null);
  const [reportTransactions, setReportTransactions] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(null);

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

  useEffect(() => {
    fetchReportStats();
  }, [reportType, queryDate, queryYear, queryMonth]);

  useEffect(() => {
    fetchTransactionsRange();
  }, [page, startDate, endDate]);

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
        if (row.type !== 'redeem' || !row.platformFee) return <span className="text-slate-400">—</span>;
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
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setReportType('monthly')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    reportType === 'monthly' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400'
                  }`}
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
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm"
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
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">To Date</label>
              <input
                type="date"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => handleExport('excel')}
              disabled={isExporting !== null}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-500/10 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
              className="w-full py-3 border border-slate-200 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
