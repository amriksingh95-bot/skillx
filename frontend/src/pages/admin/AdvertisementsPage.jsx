import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import DataTable from '../../components/DataTable';
import Badge from '../../components/Badge';
import AdStepper from '../../components/AdStepper';
import { getDirectionsUrl } from '../../components/AdBanner';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Megaphone, Eye, MousePointerClick, RefreshCw, Check, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { THEMES, ICONS, getIconEmoji, matchThemeKey } from '../../constants/adThemes';

export default function AdvertisementsPage() {
  const [advertisements, setAdvertisements] = useState([]);
  const [stats, setStats] = useState({ totalImpressions: 0, totalClicks: 0 });
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState('All');
  const [isLoading, setIsLoading] = useState(false);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(null);
  const [previewAd, setPreviewAd] = useState(null);
  const [resumeAd, setResumeAd] = useState(null);
  const [resumeTargetStatus, setResumeTargetStatus] = useState('live');
  const [rejectAd, setRejectAd] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const tabs = ['All', 'Pending', 'Approved', 'Rejected', 'Expired', 'Live', 'Paused', 'Queued'];

  const getSuggestedResumeAction = (ad) => {
    const hasConfirmedPayment = ad.payments?.some(p => p.status === 'confirmed');
    return hasConfirmedPayment ? 'live' : 'approved';
  };

  const getPaymentSummary = (ad) => {
    if (!ad.payments || ad.payments.length === 0) return 'No payment submitted';
    const confirmed = ad.payments.filter(p => p.status === 'confirmed').length;
    const pending = ad.payments.filter(p => p.status === 'pending').length;
    const rejected = ad.payments.filter(p => p.status === 'rejected').length;
    const parts = [];
    if (confirmed) parts.push(`${confirmed} confirmed`);
    if (pending) parts.push(`${pending} pending`);
    if (rejected) parts.push(`${rejected} rejected`);
    return parts.join(', ');
  };

  const handleResume = (ad) => {
    const suggested = getSuggestedResumeAction(ad);
    setResumeTargetStatus(suggested);
    setResumeAd(ad);
  };

  const fetchStats = async () => {
    setIsStatsLoading(true);
    try {
      const res = await api.get('/api/admin/advertisements/stats');
      setStats(res.data.data);
    } catch (err) {
      toast.error('Failed to load advertisement statistics.');
    } finally {
      setIsStatsLoading(false);
    }
  };

  const fetchAdvertisements = async () => {
    setIsLoading(true);
    try {
      const statusParam = activeTab === 'All' ? '' : activeTab.toLowerCase();
      const res = await api.get(`/api/admin/advertisements?page=${page}&limit=10&status=${statusParam}`);
      setAdvertisements(res.data.data.advertisements);
      setPagination(res.data.data.pagination);
    } catch (err) {
      toast.error('Failed to load advertisements.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadData = () => {
    fetchStats();
    fetchAdvertisements();
  };

  useEffect(() => {
    loadData();
  }, [page, activeTab]);

  const handleUpdateStatus = async (id, status, rejectionReason) => {
    setActionInProgress(id);
    try {
      const body = { status };
      if (rejectionReason !== undefined) body.rejectionReason = rejectionReason;
      const res = await api.patch(`/api/admin/advertisements/${id}/status`, body);
      toast.success(res.data.message || `Status updated to ${status}.`);
      loadData();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update advertisement status.';
      toast.error(msg);
    } finally {
      setActionInProgress(null);
    }
  };

  const columns = [
    {
      header: 'Merchant Name',
      accessor: (row) => row.merchant?.businessName || '-',
      sticky: true,
      render: (row) => (
        <span className="font-bold text-slate-800 dark:text-white">
          {row.merchant?.businessName || 'Unknown Merchant'}
        </span>
      )
    },
    {
      header: 'Title',
      accessor: 'title',
      render: (row) => (
        <div className="max-w-[200px]">
          <span className="block font-semibold text-slate-800 dark:text-slate-200 truncate" title={row.title}>
            {row.title}
          </span>
          {row.description && (
            <span className="block text-xs text-slate-400 dark:text-slate-500 truncate" title={row.description}>
              {row.description}
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Package',
      accessor: 'package',
      render: (row) => (
        <span className="capitalize px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          {row.package}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => {
        const isPaymentOverdue = row.payments?.some(
          p => p.status === 'pending' && p.paidAt && new Date(p.paidAt) < new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        );
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <AdStepper ad={row} />
            {isPaymentOverdue && (
              <span className="inline-flex items-center px-2 py-0.5 text-2xs font-bold rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-900/50 whitespace-nowrap">
                Payment Verification Overdue
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Directions',
      accessor: 'showDirections',
      render: (row) => {
        const url = row.showDirections ? getDirectionsUrl(row) : null;
        if (!row.showDirections) {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide capitalize bg-slate-500/10 text-slate-400 border border-slate-700">
              Awareness Only
            </span>
          );
        }
        if (!url) {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide capitalize bg-amber-500/10 text-amber-600 border border-amber-200/50">
              No Location Set
            </span>
          );
        }
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide capitalize bg-emerald-500/10 text-emerald-600 border border-emerald-200/50 hover:bg-emerald-500/20 transition-colors cursor-pointer"
          >
            Show Directions
          </a>
        );
      }
    },
    {
      header: 'Impressions',
      accessor: 'impressions',
      render: (row) => (
        <span className="font-mono text-sm font-semibold">
          {row.impressions.toLocaleString('en-IN')}
        </span>
      )
    },
    {
      header: 'Clicks',
      accessor: 'clicks',
      render: (row) => (
        <span className="font-mono text-sm font-semibold">
          {row.clicks.toLocaleString('en-IN')}
        </span>
      )
    },
    {
      header: 'Submitted Date',
      accessor: 'createdAt',
      render: (row) => new Date(row.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    },
    {
      header: 'Start/End Date',
      accessor: (row) => `${row.startDate ? new Date(row.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '-'} - ${row.endDate ? new Date(row.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}`,
      render: (row) => (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {row.startDate ? (
            <span>
              {new Date(row.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} -{' '}
              {new Date(row.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          ) : (
            <span className="italic text-slate-400">Not scheduled</span>
          )}
        </span>
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => {
        const isBusy = actionInProgress === row.id;
        const themeKey = matchThemeKey(row.bg);
        const iconKey = row.icon || 'store';
        const iconEmoji = getIconEmoji(iconKey);
        return (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setPreviewAd(row)}
              style={{ cursor: 'pointer' }}
              title="Click to preview rendered ad"
              className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 mr-3 btn-press"
            >
              <div
                style={{
                  width: '100%', height: '100%',
                  background: row.imageUrl ? 'transparent' : THEMES[themeKey].bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                }}
              >
                {row.imageUrl ? (
                  <img src={row.imageUrl} alt={row.title} className="w-full h-full object-cover" />
                ) : (
                  <span style={{ fontSize: 28 }}>{iconEmoji}</span>
                )}
              </div>
            </button>
            <button
              onClick={() => setPreviewAd(row)}
              className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-700/50 border border-slate-200/50 dark:border-slate-700/50 rounded-lg transition-colors flex items-center gap-1 btn-press"
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </button>
            {row.status !== 'approved' && row.status !== 'expired' && row.status !== 'live' && row.status !== 'paused' && (
              <button
                disabled={isBusy}
                onClick={() => handleUpdateStatus(row.id, 'approved')}
                className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-900/30 border border-emerald-200/50 dark:border-emerald-900/50 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50 btn-press"
              >
                <Check className="w-3.5 h-3.5" />
                Approve
              </button>
            )}
            {row.status === 'pending' && (
              <button
                disabled={isBusy}
                onClick={() => { setRejectAd(row); setRejectReason(''); }}
                className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-900/30 border border-rose-200/50 dark:border-rose-900/50 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50 btn-press"
              >
                <X className="w-3.5 h-3.5" />
                Reject
              </button>
            )}
            {(row.status === 'approved' || row.status === 'live') && (
              <button
                disabled={isBusy}
                onClick={() => handleUpdateStatus(row.id, 'expired')}
                className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 border border-slate-200/50 dark:border-slate-700/50 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50 btn-press"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                Expire
              </button>
            )}
            {row.status === 'live' && (
              <button
                disabled={isBusy}
                onClick={() => handleUpdateStatus(row.id, 'paused')}
                className="px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-900/30 border border-amber-200/50 dark:border-amber-900/50 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50 btn-press"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                Pause
              </button>
            )}
            {row.status === 'paused' && (
              <button
                disabled={isBusy}
                onClick={() => handleResume(row)}
                className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-900/30 border border-emerald-200/50 dark:border-emerald-900/50 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50 btn-press"
              >
                <Check className="w-3.5 h-3.5" />
                Resume
              </button>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-primary" />
            Business Advertisements
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Moderate merchant banners, review campaign packages, and track impression/click engagement metrics.
          </p>
        </div>
        <button
          onClick={loadData}
          className="p-3 bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm flex items-center justify-center gap-2 text-sm font-semibold btn-press"
          title="Reload statistics and list"
        >
          <RefreshCw className="w-4 h-4" />
          Reload
        </button>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl text-indigo-600 dark:text-indigo-400">
              <Eye className="w-6 h-6" />
            </div>
            {isStatsLoading && (
              <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent animate-spin rounded-full" />
            )}
          </div>
          <div className="mt-4">
            <h3 className="text-slate-400 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">Total Impressions</h3>
            <p className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">
              {stats.totalImpressions.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl text-emerald-600 dark:text-emerald-400">
              <MousePointerClick className="w-6 h-6" />
            </div>
            {isStatsLoading && (
              <span className="w-4 h-4 border-2 border-emerald-600 border-t-transparent animate-spin rounded-full" />
            )}
          </div>
          <div className="mt-4">
            <h3 className="text-slate-400 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">Total Clicks</h3>
            <p className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">
              {stats.totalClicks.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs Container */}
      <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 font-bold text-sm text-slate-800 dark:text-white">
          <Megaphone className="w-4 h-4 text-primary" />
          Filter by Status
        </div>
        <div className="flex gap-2 border-b border-slate-100 dark:border-dark-border pb-4 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setPage(1);
              }}
              className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 shrink-0 ${
                activeTab === tab
                  ? 'bg-primary text-white shadow-sm shadow-primary/20'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
              } btn-press`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Advertisements Table */}
        <DataTable
          columns={columns}
          data={advertisements}
          pagination={pagination}
          onPageChange={setPage}
          isLoading={isLoading}
          stickyHeader
        />
      </div>

      {resumeAd && (
        <div
          onClick={() => setResumeAd(null)}
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5"
          >
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Resume Advertisement</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {resumeAd.title}
              </p>
            </div>

            {resumeAd.pausedReason && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1">Pause Reason</p>
                <p className="text-sm text-amber-800 dark:text-amber-300">{resumeAd.pausedReason}</p>
              </div>
            )}

            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Payment History</p>
              <p className="text-sm font-semibold text-slate-800 dark:text-white">{getPaymentSummary(resumeAd)}</p>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Resume Action</p>
              <div className="space-y-2">
                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${resumeTargetStatus === 'live' ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-600' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                  <input
                    type="radio"
                    name="resumeTarget"
                    value="live"
                    checked={resumeTargetStatus === 'live'}
                    onChange={() => setResumeTargetStatus('live')}
                    className="accent-emerald-600"
                  />
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">Resume to Live</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Ad will be visible to customers immediately</p>
                  </div>
                </label>
                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${resumeTargetStatus === 'approved' ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-600' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                  <input
                    type="radio"
                    name="resumeTarget"
                    value="approved"
                    checked={resumeTargetStatus === 'approved'}
                    onChange={() => setResumeTargetStatus('approved')}
                    className="accent-blue-600"
                  />
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">Resume to Approved</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Merchant must complete payment before ad goes live</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setResumeAd(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors btn-press"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleUpdateStatus(resumeAd.id, resumeTargetStatus);
                  setResumeAd(null);
                }}
                className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors btn-press"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectAd && (
        <div
          onClick={() => !isRejecting && setRejectAd(null)}
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5"
          >
            <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-2xl">
              <h4 className="font-extrabold text-sm text-slate-800 dark:text-white mb-1">
                Reject {rejectAd.title}?
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                This will mark the advertisement as rejected and reject any pending payments. This action can be reviewed later.
              </p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Rejection Reason (Optional)</label>
              <textarea
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white h-24 resize-none"
                placeholder="Reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-dark-border pt-4">
              <button
                type="button"
                disabled={isRejecting}
                onClick={() => setRejectAd(null)}
                className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-extrabold text-slate-700 dark:text-slate-300 transition-colors btn-press"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRejecting}
                onClick={() => {
                  setIsRejecting(true);
                  handleUpdateStatus(rejectAd.id, 'rejected', rejectReason);
                  setRejectAd(null);
                  setIsRejecting(false);
                }}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-rose-500/10 transition-colors flex items-center gap-1.5 btn-press"
              >
                {isRejecting ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                ) : null}
                Reject Advertisement
              </button>
            </div>
          </div>
        </div>
      )}

      {previewAd && (
        <div
          onClick={() => setPreviewAd(null)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'pointer'
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <div
              className="ad-preview-grid"
              style={{
                minHeight: 160,
                display: 'grid',
                gridTemplateColumns: '36px 200px 1fr 100px 36px',
                gap: '12px',
                padding: '0 12px',
                background: THEMES[matchThemeKey(previewAd.bg)].bg,
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              <style>{`
                @media (max-width: 640px) {
                  .ad-preview-grid {
                    grid-template-columns: 36px 1fr 36px !important;
                    grid-template-rows: auto auto auto !important;
                  }
                  .ap-arrow-first { grid-column: 1; }
                  .ap-brand { grid-column: 2 / -1; }
                  .ap-headline { grid-column: 2; }
                  .ap-desc { grid-column: 2 / -1; font-size: 12px; }
                  .ap-badge { grid-column: 2 / -1; grid-row: 3; justify-self: end; margin-right: 36px; }
                  .ap-arrow-last { grid-column: 3; grid-row: auto; justify-self: auto; margin-right: 0; font-size: inherit; }
                }
              `}</style>

              {/* Arrow spacer */}
              <div className="ap-arrow-first"></div>

              {/* Brand identity */}
              <div className="ap-brand" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 10,
                    background: THEMES[matchThemeKey(previewAd.bg)].accent + '33',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                    flexShrink: 0,
                    border: `1px solid ${THEMES[matchThemeKey(previewAd.bg)].accent}66`,
                    overflow: 'hidden'
                  }}
                >
                  {previewAd.imageUrl ? (
                    <img src={previewAd.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 28 }}>{getIconEmoji(previewAd.icon)}</span>
                  )}
                </div>
                <div style={{ minWidth: 0, flex: '1 1 auto', maxWidth: '100%' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                    {previewAd.merchant?.businessName || 'Business Name'}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', whiteSpace: 'normal', wordBreak: 'break-word', marginTop: 2 }}>
                    Location not set
                  </div>
                </div>
              </div>

              {/* Headline */}
              <div className="ap-headline" style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: '#fff', lineHeight: 1.3, width: '100%', textAlign: 'center' }}>
                  {previewAd.title}
                </div>
              </div>

              {/* Description */}
              {previewAd.description && (
                <div className="ap-desc" style={{ gridColumn: '2 / -1', fontSize: 13, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 1.4, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                  {previewAd.description}
                </div>
              )}

              {/* Badge */}
              <div className="ap-badge" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: '50%',
                    border: 'none',
                    cursor: 'pointer',
                    background: '#f59e0b',
                    color: '#000',
                    fontWeight: 800,
                    fontSize: (previewAd.ctaText || 'Learn More').length > 10 ? 12 : 14,
                    lineHeight: 1.15,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: 8,
                  }}
                >
                  {previewAd.ctaText || 'Learn More'}
                </button>
              </div>

              {/* Arrow spacer */}
              <div className="ap-arrow-last"></div>
            </div>
            <button
              onClick={() => setPreviewAd(null)}
              style={{
                position: 'absolute',
                top: '-12px', right: '-12px',
                background: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '28px', height: '28px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '16px'
              }}
            >�</button>
          </div>
        </div>
      )}
    </div>
  );
}
