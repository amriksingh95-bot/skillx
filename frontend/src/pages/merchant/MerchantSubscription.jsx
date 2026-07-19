import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  CreditCard,
  CheckCircle,
  AlertTriangle,
  Clock,
  Calendar,
  RefreshCw,
  ArrowRight,
  Package,
  Zap,
  Star,
  Upload
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import gpayQR from '../../assets/gpay-qr.png';

const statusConfig = {
  active: { label: 'Active', color: 'emerald', icon: CheckCircle },
  grace_period: { label: 'Grace Period', color: 'amber', icon: AlertTriangle },
  expired: { label: 'Expired', color: 'red', icon: Clock },
  cancelled: { label: 'Cancelled', color: 'slate', icon: Clock },
  none: { label: 'No Subscription', color: 'slate', icon: CreditCard }
};

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

export default function MerchantSubscription() {
  const [subscription, setSubscription] = useState(null);
  const [history, setHistory] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [merchantStatus, setMerchantStatus] = useState(null);
  const [subscriptionUpiId, setSubscriptionUpiId] = useState('');
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Modal states
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [renewalScreenshotFile, setRenewalScreenshotFile] = useState(null);
  const [isRenewalUploading, setIsRenewalUploading] = useState(false);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/merchant/subscription');
      const d = res.data.data;
      setSubscription({ ...d.subscription, daysRemaining: d.daysRemaining, isActive: d.isActive, status: d.status, availablePlans: d.availablePlans });
      setPlans(d.availablePlans || []);
      setSubscriptionUpiId(d.upiId || '');
      if (d.status) {
        setMerchantStatus(d.status);
      }
    } catch (err) {
      toast.error('Failed to load subscription status.');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await api.get('/api/merchant/subscription/history');
      setHistory(res.data.data || []);
    } catch (err) {
      console.error('Subscription fetch error:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchMerchantStatus = async () => {
    try {
      const res = await api.get('/api/merchant/profile');
      if (res.data.data && res.data.data.status) {
        setMerchantStatus(res.data.data.status);
      }
    } catch (err) {
      console.error('Subscription fetch error:', err);
    }
  };

  useEffect(() => {
    fetchSubscription();
    fetchHistory();
    fetchMerchantStatus();
  }, []);

  const handleOpenPurchase = (plan) => {
    setSelectedPlan(plan);
    setIsPurchaseOpen(true);
  };

  const handleOpenRenew = () => {
    setIsRenewOpen(true);
  };

  const handleRenew = async (e) => {
    e.preventDefault();
    if (!subscription?.id || !renewalScreenshotFile) return;

    setIsRenewalUploading(true);
    try {
      const formData = new FormData();
      formData.append('screenshot', renewalScreenshotFile);
      formData.append('subscriptionId', subscription.id);

      await api.post('/api/merchant/subscription/renewal/upload-screenshot', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('Screenshot uploaded – admin will verify within 3 days');
      setIsRenewOpen(false);
      setRenewalScreenshotFile(null);
      await Promise.all([fetchSubscription(), fetchHistory(), fetchMerchantStatus()]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload renewal screenshot.');
    } finally {
      setIsRenewalUploading(false);
    }
  };

  const handleScreenshotUpload = async (e) => {
    e.preventDefault();
    if (!screenshotFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('screenshot', screenshotFile);

      await api.post('/api/merchant/subscription/upload-screenshot', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('Screenshot uploaded. Admin will verify within 24 hours.');
      setScreenshotFile(null);
      await fetchMerchantStatus();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload screenshot.');
    } finally {
      setIsUploading(false);
    }
  };

  const currentStatus = subscription?.status || 'none';
  const config = statusConfig[currentStatus] || statusConfig.none;
  const StatusIcon = config.icon;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">Subscription</h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your subscription plan and billing.
        </p>
      </div>

      {/* Current Subscription Status */}
      <div className={`rounded-2xl p-6 shadow-sm ${
        currentStatus === 'active'
          ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800/50'
          : currentStatus === 'grace_period'
          ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800/50'
          : 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 border border-red-200 dark:border-red-800/50'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${
              currentStatus === 'active'
                ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                : currentStatus === 'grace_period'
                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
                : 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
            }`}>
              <StatusIcon className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                  currentStatus === 'active'
                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                    : currentStatus === 'grace_period'
                    ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                    : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                }`}>
                  {config.label}
                </span>
              </div>
              <p className="text-lg font-black text-slate-800 dark:text-white mt-1">
                {subscription?.plan?.displayName || 'No Active Plan'}
              </p>
              {subscription && (
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Started {formatDate(subscription.startDate)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Expires {formatDate(subscription.endDate)}
                  </span>
                  {subscription.daysRemaining !== null && (
                    <span className={`font-bold ${
                      currentStatus === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                    }`}>
                      {subscription.daysRemaining} days remaining
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {currentStatus === 'active' && merchantStatus !== 'payment_pending' && (
              <button
                onClick={handleOpenRenew}
                className="px-5 py-2.5 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 btn-press"
              >
                <RefreshCw className="w-4 h-4" />
                Renew
              </button>
            )}
            {currentStatus === 'active' && merchantStatus === 'payment_pending' && (
              <span className="px-5 py-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-bold flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Renewal pending verification
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Grace Period Warning */}
      {currentStatus === 'grace_period' && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                Your subscription has expired
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                You are in a 15-day grace period. Your operations are still active, but please renew before the grace period ends to avoid service interruption.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pending Review Message */}
      {currentStatus === 'pending' && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-blue-800 dark:text-blue-200">
                Your application is under review
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Your application is under admin review. You will be notified once approved.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Approved - UPI Payment Section */}
      {currentStatus === 'approved' && (
        <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-base text-slate-800 dark:text-white">Complete Your Activation</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pay ₹399 via UPI to activate your account
          </p>

          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 flex items-center justify-between">
            <span className="text-sm font-mono font-bold text-slate-800 dark:text-white">{subscriptionUpiId || 'Not available'}</span>
            <button
              onClick={() => navigator.clipboard.writeText(subscriptionUpiId)}
              className="px-3 py-1.5 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all btn-press"
            >
              Copy
            </button>
          </div>

          <div className="flex flex-col items-center gap-2">
            <img
              src="/upi-qr.png"
              alt="Scan to pay ₹399"
              className="w-48 h-48 object-contain border border-slate-200 dark:border-dark-border rounded-xl"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="hidden w-48 h-48 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl text-xs text-slate-400 text-center p-4">
              QR Code placeholder<br />/upi-qr.png
            </div>
            <p className="text-xs text-slate-400">Scan QR code to pay ₹399</p>
            </div>

          {/* GPay QR Payment Section */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4 text-center">
            <h3 className="text-base font-semibold text-slate-700 mb-1">Scan & Pay ₹399</h3>
            <p className="text-xs text-slate-500 mb-3">Use any UPI app – GPay, PhonePe, Paytm</p>
            <img
              src={gpayQR}
              alt="GPay QR Code"
              className="w-48 h-48 mx-auto rounded-lg border border-slate-200 object-contain"
            />
            <div className="mt-3 bg-slate-50 rounded-lg px-4 py-2 inline-block">
              <p className="text-xs text-slate-500">UPI ID</p>
              <p className="text-sm font-bold text-slate-800 select-all">{subscriptionUpiId}</p>
            </div>
            <p className="text-xs text-amber-600 mt-3 font-medium">Note: After payment, upload screenshot below for admin verification</p>
          </div>

          <form onSubmit={handleScreenshotUpload} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Upload Payment Screenshot
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setScreenshotFile(e.target.files[0])}
                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
              {screenshotFile && (
                <p className="text-xs text-slate-500 mt-1">{screenshotFile.name}</p>
              )}
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-3">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Note: This is a demo system. No actual payment will be processed. Admin will verify your payment within 24 hours.
              </p>
            </div>

            <button
              type="submit"
              disabled={!screenshotFile || isUploading}
              className="w-full py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 btn-press"
            >
              {isUploading ? <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" /> : null}
              Submit Payment Proof
            </button>
          </form>
        </div>
      )}

      {/* Payment Pending Verification Message */}
      {currentStatus === 'payment_pending' && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                Payment under verification
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Your payment screenshot has been received. Admin is verifying your payment. You will be notified within 24 hours.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Available Plans */}
      <div>
        <h2 className="text-lg font-black text-slate-800 dark:text-white mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.filter(plan => plan.name === 'monthly').map((plan) => {
            const isCurrentPlan = subscription?.planId === plan.id && currentStatus === 'active';
            const pricePerDay = plan.durationDays > 0 ? (plan.price / plan.durationDays).toFixed(2) : '0.00';

            return (
              <div
                key={plan.id}
                className={`relative bg-white dark:bg-dark-card border rounded-2xl p-6 transition-all ${
                  isCurrentPlan
                    ? 'border-primary shadow-md shadow-primary/10 ring-2 ring-primary/20'
                    : 'border-slate-200 dark:border-dark-border hover:border-primary/50 hover:shadow-md'
                }`}
              >
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      Current Plan
                    </span>
                  </div>
                )}

                <div className="text-center mb-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary mb-3">
                    {plan.name === 'monthly' && <Zap className="w-6 h-6" />}
                    {plan.name === 'quarterly' && <Star className="w-6 h-6" />}
                    {plan.name === 'annual' && <Package className="w-6 h-6" />}
                    {!['monthly', 'quarterly', 'annual'].includes(plan.name) && <CreditCard className="w-6 h-6" />}
                  </div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white">{plan.displayName}</h3>
                  {plan.name === 'monthly' && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Billed monthly. Cancel anytime by contacting admin.</p>
                  )}
                  <div className="mt-2">
                    <span className="text-3xl font-black text-primary">₹{plan.price}{plan.name === 'monthly' ? '/month' : ''}</span>
                    {plan.name !== 'monthly' && <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">/ {plan.durationDays} days</span>}
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">₹{pricePerDay}/day</p>
                </div>

                {plan.features && plan.features.length > 0 && (
                  <ul className="space-y-2 mb-6">
                    {(typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features).map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}

                <button
                  onClick={() => handleOpenPurchase(plan)}
                  disabled={isCurrentPlan}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    isCurrentPlan
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      : 'bg-primary hover:bg-primary-dark text-white shadow-sm hover:shadow-md'
                  } btn-press`}
                >
                  {isCurrentPlan ? 'Active' : (
                    <>
                      Select Plan
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subscription History */}
      <div>
        <h2 className="text-lg font-black text-slate-800 dark:text-white mb-4">Subscription History</h2>
        {historyLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : history.length === 0 ? (
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-8 text-center">
            <CreditCard className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No subscription history yet.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-slate-800/50">
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Plan</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Start Date</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">End Date</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Payment Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-dark-border">
                  {history.map((sub) => {
                    const subConfig = statusConfig[sub.status] || statusConfig.none;
                    const SubIcon = subConfig.icon;
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className="text-sm font-bold text-slate-800 dark:text-white">
                            {sub.plan?.displayName || 'Unknown Plan'}
                          </span>
                          <span className="block text-xs text-slate-400">₹{sub.plan?.price}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                            sub.status === 'active'
                              ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                              : sub.status === 'grace_period'
                              ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                              : sub.status === 'expired'
                              ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}>
                            <SubIcon className="w-3 h-3" />
                            {subConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                          {formatDate(sub.startDate)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                          {formatDate(sub.endDate)}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {sub.paymentRef || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Purchase Modal – informational only */}
      <Modal isOpen={isPurchaseOpen} onClose={() => { setIsPurchaseOpen(false); setSelectedPlan(null); }} title="Purchase Subscription">
        <div className="space-y-4">
          {selectedPlan && (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Plan:</span>
                <span className="font-bold text-slate-800 dark:text-white">{selectedPlan.displayName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Price:</span>
                <span className="font-bold text-primary">₹{selectedPlan.price}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Duration:</span>
                <span className="font-bold text-slate-800 dark:text-white">{selectedPlan.durationDays} days</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">New End Date:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {formatDate(new Date(Date.now() + selectedPlan.durationDays * 86400000))}
                </span>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center space-y-3">
            <p className="text-xs font-medium text-slate-500">Scan & pay using any UPI app</p>
            <img
              src={gpayQR}
              alt="GPay QR Code"
              className="w-44 h-44 mx-auto rounded-lg border border-slate-200 object-contain"
            />
            <div className="bg-slate-50 rounded-lg px-4 py-2 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Pay to</span>
                <span className="text-sm font-bold text-slate-800">Amrik Singh</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">UPI ID</span>
                <span className="text-sm font-bold text-slate-800 select-all cursor-text">{subscriptionUpiId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Amount</span>
                <span className="text-sm font-bold text-emerald-600">₹399</span>
              </div>
            </div>
            <p className="text-xs text-amber-600 font-medium">Note: After paying, scroll down to upload your payment screenshot</p>
          </div>

          <button
            type="button"
            onClick={() => { setIsPurchaseOpen(false); setSelectedPlan(null); }}
            className="w-full py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold shadow-sm transition-all btn-press"
          >
            Got it
          </button>
        </div>
      </Modal>

      {/* Renew Modal */}
      <Modal isOpen={isRenewOpen} onClose={() => { setIsRenewOpen(false); setRenewalScreenshotFile(null); }} title="Renew Subscription">
        <form onSubmit={handleRenew} className="space-y-4">
          {subscription?.subscription && (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Current Plan:</span>
                <span className="font-bold text-slate-800 dark:text-white">{subscription.plan?.displayName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Current End Date:</span>
                <span className="font-bold text-slate-800 dark:text-white">{formatDate(subscription.endDate)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">New End Date:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {subscription.plan?.durationDays
                    ? formatDate(new Date(
                        Math.max(new Date(), new Date(subscription.endDate)).getTime() +
                        subscription.plan.durationDays * 86400000
                      ))
                    : 'N/A'}
                </span>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center space-y-3">
            <p className="text-xs font-medium text-slate-500">Scan & pay using any UPI app</p>
            <img
              src={gpayQR}
              alt="GPay QR Code"
              className="w-44 h-44 mx-auto rounded-lg border border-slate-200 object-contain"
            />
            <div className="bg-slate-50 rounded-lg px-4 py-2 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Pay to</span>
                <span className="text-sm font-bold text-slate-800">Amrik Singh</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">UPI ID</span>
                <span className="text-sm font-bold text-slate-800 select-all cursor-text">{subscriptionUpiId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Amount</span>
                <span className="text-sm font-bold text-emerald-600">₹399</span>
              </div>
            </div>
            <p className="text-xs text-amber-600 font-medium">Note: After paying, upload your payment screenshot below</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Upload Payment Screenshot
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setRenewalScreenshotFile(e.target.files[0])}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
            {renewalScreenshotFile && (
              <p className="text-xs text-slate-500 mt-1">{renewalScreenshotFile.name}</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setIsRenewOpen(false); setRenewalScreenshotFile(null); }}
              className="flex-1 py-2.5 border border-slate-200 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all btn-press"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!renewalScreenshotFile || isRenewalUploading}
              className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 btn-press"
            >
              {isRenewalUploading ? <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" /> : <Upload className="w-4 h-4" />}
              Upload & Submit
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
