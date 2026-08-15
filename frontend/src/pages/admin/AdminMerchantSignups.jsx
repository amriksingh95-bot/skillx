import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import DataTable from '../../components/DataTable';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import { Phone, RefreshCw, TrendingDown, StickyNote } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminMerchantSignups() {
  const [merchants, setMerchants] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [callModalMerchant, setCallModalMerchant] = useState(null);
  const [callNote, setCallNote] = useState('');
  const [isLogging, setIsLogging] = useState(false);

  const fetchReport = async (showSpinner = true) => {
    if (showSpinner) setIsLoading(true);
    try {
      const res = await api.get('/api/admin/reports/merchant-signups');
      setMerchants(res.data.data.merchants || []);
    } catch (err) {
      toast.error('Failed to load merchant signup performance.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleOpenCallModal = (row) => {
    setCallModalMerchant(row);
    setCallNote('');
  };

  const handleLogCall = async (e) => {
    e.preventDefault();
    if (!callModalMerchant) return;
    setIsLogging(true);
    try {
      await api.post(`/api/admin/reports/merchant-signups/${callModalMerchant.id}/call-log`, { note: callNote.trim() });
      toast.success('Call logged.');
      setCallModalMerchant(null);
      setCallNote('');
      fetchReport(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to log call.');
    } finally {
      setIsLogging(false);
    }
  };

  const columns = [
    {
      header: 'Merchant',
      accessor: 'businessName',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-800 dark:text-white block">{row.businessName}</span>
          <Badge type={row.category}>{row.category}</Badge>
        </div>
      )
    },
    {
      header: 'Today',
      accessor: 'signupsToday',
      sortable: true,
      sortKey: 'signupsToday',
      render: (row) => <span className="font-bold">{row.signupsToday}</span>
    },
    {
      header: '7 Days',
      accessor: 'signupsLast7Days',
      sortable: true,
      sortKey: 'signupsLast7Days',
      render: (row) => (
        row.signupsLast7Days === 0
          ? <Badge type="warning">0 signups</Badge>
          : <span className="font-bold">{row.signupsLast7Days}</span>
      )
    },
    {
      header: '30 Days',
      accessor: 'signupsLast30Days',
      sortable: true,
      sortKey: 'signupsLast30Days',
      render: (row) => (
        <div>
          <span className="font-bold">{row.signupsLast30Days}</span>
          {row.signupsLast30Days < row.categoryAvg30Days && (
            <span className="flex items-center gap-0.5 text-xs font-bold text-rose-500 mt-0.5">
              <TrendingDown className="w-3 h-3" /> below avg
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Cat. Avg (30d)',
      accessor: 'categoryAvg30Days',
      render: (row) => <span className="text-sm text-slate-500">{row.categoryAvg30Days}</span>
    },
    {
      header: 'Last Call',
      accessor: 'lastCalledAt',
      render: (row) => {
        if (!row.lastCalledAt) return <span className="text-xs text-slate-400">Never</span>;
        return (
          <div>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
              {new Date(row.lastCalledAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
            {row.lastCallNote && (
              <span className="text-xs text-slate-400 block mt-0.5 truncate max-w-[180px]">{row.lastCallNote}</span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.phone && (
            <a
              href={`tel:${row.phone}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-extrabold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/20 transition-colors btn-press"
              title={`Call ${row.phone}`}
            >
              <Phone className="w-3.5 h-3.5" /> Call
            </a>
          )}
          <button
            onClick={() => handleOpenCallModal(row)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-extrabold rounded-lg bg-slate-700 hover:bg-slate-800 text-white dark:bg-slate-600 dark:hover:bg-slate-500 shadow-sm transition-colors btn-press"
          >
            <StickyNote className="w-3.5 h-3.5" /> Log Call
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white">Merchant Signup Performance</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          New customers signed up via each merchant's code — today, 7 days and 30 days — with call tracking.
        </p>
      </div>

      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-base text-slate-800 dark:text-white">Active Merchants</h3>
            <p className="text-xs text-slate-400 mt-0.5">Signup counts per merchant, category average, and latest call note</p>
          </div>
          <button
            onClick={() => fetchReport(true)}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-all btn-press"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <DataTable
          columns={columns}
          data={merchants}
          isLoading={isLoading}
        />
      </div>

      <Modal
        isOpen={!!callModalMerchant}
        onClose={() => setCallModalMerchant(null)}
        title={`Log Call — ${callModalMerchant?.businessName || ''}`}
        footer={
          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              onClick={() => setCallModalMerchant(null)}
              className="px-4 py-2 border border-slate-200 dark:border-dark-border text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors btn-press"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="call-log-form"
              disabled={isLogging}
              className="px-4 py-2 bg-secondary hover:bg-secondary-dark text-white rounded-xl text-sm font-bold shadow-md shadow-secondary/20 transition-all btn-press disabled:opacity-50"
            >
              {isLogging ? 'Saving...' : 'Save Call'}
            </button>
          </div>
        }
      >
        <form id="call-log-form" onSubmit={handleLogCall} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-2">
              Note (optional)
            </label>
            <textarea
              rows={4}
              value={callNote}
              onChange={(e) => setCallNote(e.target.value)}
              placeholder="What was discussed in the call?"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}