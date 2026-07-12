import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import { RefreshCw, Plus, CreditCard, Clock, CheckCircle, AlertTriangle, Store, Calendar, AlertCircle, TrendingDown } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminMerchantSubscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [screenshotModal, setScreenshotModal] = useState({ open: false, url: null, merchantId: null, merchantName: '' });
  const [confirmingPayment, setConfirmingPayment] = useState(false);

  // Expiring subscriptions data
  const [expiringData, setExpiringData] = useState(null);
  const [isLoadingExpiring, setIsLoadingExpiring] = useState(false);
  
  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  
  // Form Fields
  const [selectedMerchantId, setSelectedMerchantId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSubscriptions = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10'
      });
      if (statusFilter && statusFilter !== 'payment_pending') params.append('status', statusFilter);

      const res = await api.get(`/api/admin/merchant-subscriptions?${params}`);
      setSubscriptions(res.data.data.subscriptions);
      setPagination(res.data.data.pagination);
    } catch (err) {
      toast.error('Failed to load subscriptions.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExpiringSubscriptions = async () => {
    setIsLoadingExpiring(true);
    try {
      const res = await api.get('/api/admin/subscriptions/expiring');
      setExpiringData(res.data.data);
    } catch (err) {
      // Silent fail for expiring data
    } finally {
      setIsLoadingExpiring(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await api.get('/api/admin/subscription-plans');
      setPlans(res.data.data || []);
    } catch (err) {
      // Silent
    }
  };

  const fetchMerchants = async () => {
    try {
      const res = await api.get('/api/admin/merchants?limit=100');
      setMerchants(res.data.data.merchants || []);
    } catch (err) {
      // Silent
    }
  };

  const fetchPendingPayments = async () => {
    try {
      setLoadingPending(true);
      const res = await api.get('/api/admin/merchants/pending-payments');
      setPendingPayments(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch pending payments:', err);
    } finally {
      setLoadingPending(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
    fetchPendingPayments();
  }, [page, statusFilter]);

  useEffect(() => {
    fetchPlans();
    fetchMerchants();
    fetchExpiringSubscriptions();
  }, []);

  const handleConfirmPayment = async (merchantId) => {
    try {
      setConfirmingPayment(true);
      await api.patch(`/api/admin/merchants/${merchantId}/confirm-payment`);
      setScreenshotModal({ open: false, url: null, merchantId: null, merchantName: '' });
      fetchPendingPayments();
      alert('? Payment confirmed! Merchant is now active.');
    } catch (err) {
      alert('? Failed to confirm payment: ' + (err.response?.data?.message || err.message));
    } finally {
      setConfirmingPayment(false);
    }
  };

  const handleRejectPayment = async (merchantId) => {
  if (!window.confirm('Reject this payment? Merchant will need to re-upload screenshot.')) return;
  try {
    setConfirmingPayment(true);
    await api.patch(`/api/admin/merchants/${merchantId}/reject-payment`);
    setScreenshotModal({ open: false, url: null, merchantId: null, merchantName: '' });
    fetchPendingPayments();
    alert('? Payment rejected. Merchant notified to re-upload.');
  } catch (err) {
    alert('Failed to reject payment: ' + (err.response?.data?.message || err.message));
  } finally {
    setConfirmingPayment(false);
  }
};

const handleOpenAdd = () => {
    setSelectedMerchantId('');
    setSelectedPlanId('');
    setPaymentRef('');
    setIsAddOpen(true);
  };

  const handleOpenRenew = (sub) => {
    setSelectedSubscription(sub);
    setPaymentRef('');
    setIsRenewOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!selectedMerchantId || !selectedPlanId) {
      return toast.error('Please select a merchant and plan.');
    }

    setIsSubmitting(true);
    try {
      await api.post('/api/admin/merchant-subscriptions', {
        merchantId: selectedMerchantId,
        planId: selectedPlanId,
        paymentRef: paymentRef || undefined
      });

      toast.success('Subscription created successfully!');
      setIsAddOpen(false);
      fetchSubscriptions();
      fetchExpiringSubscriptions();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create subscription.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRenew = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.patch(`/api/admin/merchant-subscriptions/${selectedSubscription.id}/renew`, {
        paymentRef: paymentRef || undefined
      });

      toast.success('Subscription renewed successfully!');
      setIsRenewOpen(false);
      setSelectedSubscription(null);
      fetchSubscriptions();
      fetchExpiringSubscriptions();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to renew subscription.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      active: { type: 'active', label: 'Active' },
      grace_period: { type: 'warning', label: 'Grace Period' },
      expired: { type: 'error', label: 'Expired' },
      cancelled: { type: 'inactive', label: 'Cancelled' }
    };
    const s = statusMap[status] || { type: 'default', label: status };
    return <Badge type={s.type}>{s.label}</Badge>;
  };

  const getDaysRemaining = (row) => {
    const targetDate = row.status === 'grace_period' ? row.gracePeriodEnd : row.endDate;
    if (!targetDate) return null;
    const now = new Date();
    const end = new Date(targetDate);
    const diffMs = end.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const getDaysRemainingBadge = (row) => {
    const days = getDaysRemaining(row);
    if (days === null) return <span className="text-slate-400">-</span>;
    
    let colorClass = 'text-slate-600 dark:text-slate-300';
    let bgColor = 'bg-slate-100 dark:bg-slate-800';
    
    if (days <= 0) {
      colorClass = 'text-red-600 dark:text-red-400';
      bgColor = 'bg-red-100 dark:bg-red-900/30';
    } else if (days <= 3) {
      colorClass = 'text-red-600 dark:text-red-400';
      bgColor = 'bg-red-100 dark:bg-red-900/30';
    } else if (days <= 7) {
      colorClass = 'text-amber-600 dark:text-amber-400';
      bgColor = 'bg-amber-100 dark:bg-amber-900/30';
    } else if (days <= 15) {
      colorClass = 'text-yellow-600 dark:text-yellow-400';
      bgColor = 'bg-yellow-100 dark:bg-yellow-900/30';
    } else if (days <= 30) {
      colorClass = 'text-blue-600 dark:text-blue-400';
      bgColor = 'bg-blue-100 dark:bg-blue-900/30';
    }
    
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${bgColor} ${colorClass}`}>
        {days <= 0 ? 'Expired' : `${days}d`}
      </span>
    );
  };

  const columns = [
    {
      header: 'Merchant',
      accessor: 'merchant',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-slate-400" />
          <span className="font-bold text-slate-800 dark:text-white">{row.merchant?.businessName || 'N/A'}</span>
        </div>
      )
    },
    {
      header: 'Plan',
      accessor: 'plan',
      render: (row) => (
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary" />
          <span>{row.plan?.displayName || 'N/A'}</span>
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => getStatusBadge(row.status)
    },
    {
      header: 'Days Left',
      accessor: 'daysLeft',
      render: (row) => getDaysRemainingBadge(row)
    },
    {
      header: 'Start Date',
      accessor: 'startDate',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{formatDate(row.startDate)}</span>
        </div>
      )
    },
    {
      header: 'End Date',
      accessor: 'endDate',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{formatDate(row.endDate)}</span>
        </div>
      )
    },
    {
      header: 'Grace Period End',
      accessor: 'gracePeriodEnd',
      render: (row) => row.gracePeriodEnd ? (
        <div className="flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-amber-600 dark:text-amber-400">{formatDate(row.gracePeriodEnd)}</span>
        </div>
      ) : <span className="text-slate-400">-</span>
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => (
        <button
          onClick={() => handleOpenRenew(row)}
          className="text-primary hover:text-primary-dark font-bold text-xs flex items-center gap-1 btn-press"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Renew
        </button>
      )
    }
  ];

  const summaryCards = expiringData ? [
    {
      label: 'Expiring in 30 Days',
      value: expiringData.stats.expiringIn30Days,
      icon: Clock,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      filter: 'active'
    },
    {
      label: 'Expiring in 15 Days',
      value: expiringData.stats.expiringIn15Days,
      icon: AlertCircle,
      color: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      filter: 'active'
    },
    {
      label: 'Expiring in 7 Days',
      value: expiringData.stats.expiringIn7Days,
      icon: AlertTriangle,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      filter: 'active'
    },
    {
      label: 'In Grace Period',
      value: expiringData.stats.inGracePeriod,
      icon: TrendingDown,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/30',
      filter: 'grace_period'
    },
    {
      label: 'Grace Ending Soon',
      value: expiringData.stats.gracePeriodEnding,
      icon: AlertCircle,
      color: 'text-red-700 dark:text-red-300',
      bg: 'bg-red-200 dark:bg-red-900/50',
      filter: 'grace_period'
    }
  ] : [];

  if (isLoading && subscriptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <span className="w-10 h-10 border-4 border-primary border-t-transparent animate-spin rounded-full" />
        <p className="text-xs font-bold text-slate-400 mt-3">Loading subscriptions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Payment Verifications */}
      {pendingPayments.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base font-semibold text-slate-800 dark:text-slate-100">Payment Verifications</span>
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{pendingPayments.length}</span>
          </div>
          <div className="space-y-3">
            {pendingPayments.map((merchant) => (
              <div key={merchant.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{merchant.businessName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{merchant.user?.email} � {merchant.user?.mobile}</p>
                  <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${merchant.status === 'payment_pending' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                    {merchant.status === 'payment_pending' ? '? Screenshot uploaded' : '?? Awaiting payment'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {merchant.paymentScreenshot ? (
                    <button
                      onClick={() => setScreenshotModal({ open: true, url: merchant.paymentScreenshot, merchantId: merchant.id, merchantName: merchant.businessName })}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded-lg border border-blue-200 transition btn-press"
                    >
                      View Screenshot
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No screenshot yet</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Screenshot Viewer Modal */}
      {screenshotModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Payment Screenshot</h3>
              <button onClick={() => setScreenshotModal({ open: false, url: null, merchantId: null, merchantName: '' })} className="text-slate-400 hover:text-slate-600 text-xl btn-press">�</button>
            </div>
            <p className="text-sm text-slate-500">{screenshotModal.merchantName}</p>
            <img
              src={`${api.defaults.baseURL}${screenshotModal.url}`}
              alt="Payment Screenshot"
              className="w-full rounded-xl border border-slate-200 object-contain max-h-80"
            />
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setScreenshotModal({ open: false, url: null, merchantId: null, merchantName: '' })}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 btn-press"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRejectPayment(screenshotModal.merchantId)}
                disabled={confirmingPayment}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 btn-press"
              >
                ? Reject
              </button>
              <button
                onClick={() => handleConfirmPayment(screenshotModal.merchantId)}
                disabled={confirmingPayment}
                className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 btn-press"
              >
                {confirmingPayment ? 'Confirming...' : '? Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">Merchant Subscriptions</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            View and manage merchant subscriptions, renewals, and grace periods.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { fetchSubscriptions(); fetchExpiringSubscriptions(); }}
            className="p-3 bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm flex items-center justify-center gap-2 text-sm font-semibold btn-press"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 transition-all btn-press"
          >
            <Plus className="w-4 h-4" />
            Create Subscription
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summaryCards.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {summaryCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <button
                key={idx}
                onClick={() => { setStatusFilter(card.filter); setPage(1); }}
                className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-xl p-4 text-left hover:shadow-md transition-all btn-press"
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

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        {[
          { value: '', label: 'All' },
          { value: 'payment_pending', label: '? Pending Payment' },
          { value: 'active', label: 'Active' },
          { value: 'grace_period', label: 'Grace Period' },
          { value: 'expired', label: 'Expired' },
          { value: 'cancelled', label: 'Cancelled' }
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setStatusFilter(tab.value); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === tab.value
                ? 'bg-primary text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
            } btn-press`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Subscriptions Table */}
      <DataTable
        columns={columns}
        data={subscriptions}
        pagination={pagination}
        onPageChange={setPage}
        searchPlaceholder="Search by merchant name..."
        isLoading={isLoading}
      />

      {/* Create Subscription Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Create Merchant Subscription">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Select Merchant *
            </label>
            <select
              required
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white"
              value={selectedMerchantId}
              onChange={(e) => setSelectedMerchantId(e.target.value)}
            >
              <option value="">Select a merchant...</option>
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>{m.businessName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Select Plan *
            </label>
            <select
              required
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white"
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
            >
              <option value="">Select a plan...</option>
              {plans.length === 0 ? (
                <option value="" disabled>No plans available</option>
              ) : (
                plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName} - ?{p.price}{!p.isActive ? ' (Inactive)' : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Payment Reference (Optional)
            </label>
            <input
              type="text"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white"
              placeholder="e.g. UPI transaction ID"
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="flex-1 py-2.5 border border-slate-200 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all btn-press"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 btn-press"
            >
              {isSubmitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" /> : <Plus className="w-4 h-4" />}
              Create Subscription
            </button>
          </div>
        </form>
      </Modal>

      {/* Renew Subscription Modal */}
      <Modal isOpen={isRenewOpen} onClose={() => { setIsRenewOpen(false); setSelectedSubscription(null); }} title="Renew Subscription">
        <form onSubmit={handleRenew} className="space-y-4">
          {selectedSubscription && (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Merchant:</span>
                <span className="font-bold text-slate-800 dark:text-white">{selectedSubscription.merchant?.businessName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Current Plan:</span>
                <span className="font-bold text-slate-800 dark:text-white">{selectedSubscription.plan?.displayName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Current End Date:</span>
                <span className="font-bold text-slate-800 dark:text-white">{formatDate(selectedSubscription.endDate)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">New End Date:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedSubscription.plan?.durationDays 
                    ? formatDate(new Date(Date.now() + selectedSubscription.plan.durationDays * 86400000))
                    : 'N/A'}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Payment Reference (Optional)
            </label>
            <input
              type="text"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white"
              placeholder="e.g. UPI transaction ID"
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => { setIsRenewOpen(false); setSelectedSubscription(null); }}
              className="flex-1 py-2.5 border border-slate-200 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all btn-press"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 btn-press"
            >
              {isSubmitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" /> : <RefreshCw className="w-4 h-4" />}
              Renew Subscription
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
