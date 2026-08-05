import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { QRCodeSVG } from 'qrcode.react';
import {
  Users,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  PlusCircle,
  Gift,
  RefreshCw,
  Wallet,
  QrCode,
  AlertCircle,
  MessageSquare,
  X,
  Copy,
  CreditCard,
  Bell
} from 'lucide-react';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import DataTable from '../../components/DataTable';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import AdBanner from '../../components/AdBanner';
import ComplaintModal from '../../components/ComplaintModal';

export default function MerchantDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [merchantProfile, setMerchantProfile] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  // Subscription State
  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [dismissedExpiryBanner, setDismissedExpiryBanner] = useState(false);

  // Complaint Modal
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);

  // Ecosystem Stats
  const [ecosystemStats, setEcosystemStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 8 });
  const bellButtonRef = useRef(null);

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/api/merchant/dashboard');
      setStats(res.data.data.stats);
      setRecentTransactions(res.data.data.recentTransactions);
    } catch (err) {
      toast.error('Failed to load merchant dashboard statistics.');
    }
  };

  const fetchCustomerInsights = async () => {
    try {
      setInsightsLoading(true);
      const res = await api.get('/api/merchant/customer-insights');
      setInsights(res.data.data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setInsightsLoading(false);
    }
  };

  const fetchMerchantProfile = async () => {
    try {
      const res = await api.get('/api/merchant/profile');
      setMerchantProfile(res.data.data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    }
  };

  const fetchEcosystemStats = async () => {
    try {
      const res = await api.get('/api/merchant/ecosystem-stats');
      setEcosystemStats(res.data.data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/api/merchant/referral/notifications?limit=5');
      setNotifications(res.data.data?.notifications || []);
    } catch (err) {
      // Silent fail — notifications are non-critical
    }
  };

  const markNotificationRead = async (id) => {
    try {
      await api.patch(`/api/merchant/referral/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      // Silent fail
    }
  };

  const fetchSubscription = async () => {
    try {
      setSubscriptionLoading(true);
      const res = await api.get('/api/merchant/subscription');
      const d = res.data.data;
      setSubscription({ ...d.subscription, daysRemaining: d.daysRemaining, isActive: d.isActive, status: d.status, availablePlans: d.availablePlans });
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await Promise.allSettled([fetchDashboardData(), fetchCustomerInsights(), fetchSubscription(), fetchMerchantProfile(), fetchEcosystemStats(), fetchNotifications()]);
    } finally {
      setLoading(false);
      toast.success('Stats updated!');
    }
  };

  useEffect(() => {
    const initData = async () => {
      try {
        await Promise.allSettled([fetchDashboardData(), fetchCustomerInsights(), fetchSubscription(), fetchMerchantProfile(), fetchEcosystemStats(), fetchNotifications()]);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  // Close notification dropdown on click-outside, scroll, or resize
  useEffect(() => {
    if (!showNotifications) return;
    const close = () => setShowNotifications(false);
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [showNotifications]);

  if (loading) return <LoadingSpinner size="large" fullPage />;

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="p-3 bg-red-500/10 text-red-500 rounded-full border border-red-500/20 animate-pulse">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Failed to load dashboard</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">There was an error retrieving your dashboard data.</p>
        </div>
        <button
          onClick={handleRefresh}
          className="px-6 py-2.5 bg-primary text-white font-extrabold rounded-xl transition-all hover:bg-primary-dark shadow-sm text-xs btn-press"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdBanner />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">{merchantProfile?.businessName || 'Merchant Station'}</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track customer transactions and manage point allocations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Notification Bell */}
          <div className="relative">
            <button
              ref={bellButtonRef}
              onClick={() => {
                if (!showNotifications && bellButtonRef.current) {
                  const rect = bellButtonRef.current.getBoundingClientRect();
                  const isMobile = window.innerWidth < 640;
                  const dropdownWidth = isMobile ? 288 : 320;
                  const margin = 8;
                  let left = rect.left + rect.width / 2 - dropdownWidth / 2;
                  left = Math.max(margin, Math.min(left, window.innerWidth - dropdownWidth - margin));
                  setDropdownPos({ top: rect.bottom + 8, left });
                }
                setShowNotifications(!showNotifications);
              }}
              className="p-3 bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm flex items-center justify-center btn-press relative"
            >
              <Bell className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              {notifications.filter(n => !n.isRead).length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {notifications.filter(n => !n.isRead).length}
                </span>
              )}
            </button>
            {showNotifications && (
              <div
                className="fixed w-72 sm:w-80 bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 overflow-hidden"
                style={{ top: dropdownPos.top, left: dropdownPos.left }}
              >
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-800 dark:text-white">Notifications</p>
                  <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600 btn-press">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                      <Bell className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="text-xs text-slate-400">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => !n.isRead && markNotificationRead(n.id)}
                        className={`px-4 py-3 border-b border-slate-50 dark:border-dark-border cursor-pointer transition-colors ${
                          n.isRead ? 'bg-white dark:bg-dark-card' : 'bg-emerald-50/50 dark:bg-emerald-950/10'
                        } hover:bg-slate-50 dark:hover:bg-slate-800/50`}
                      >
                        <div className="flex items-start gap-2">
                          {!n.isRead && <div className="w-2 h-2 bg-emerald-500 rounded-full mt-1.5 shrink-0" />}
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            {n.message}
                          </p>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => { setShowNotifications(false); navigate('/merchant/referrals'); }}
                      className="w-full text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline btn-press"
                    >
                      View all notifications
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            onClick={handleRefresh}
            className="p-3 bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm flex items-center justify-center gap-2 text-sm font-semibold shrink-0 btn-press"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Subscription Status Banner */}
      {!subscriptionLoading && subscription && (
        <div className={`rounded-2xl p-4 shadow-sm ${
          subscription.status === 'active' 
            ? 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50' 
            : subscription.status === 'grace_period'
            ? 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50'
            : 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${
                subscription.status === 'active'
                  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                  : subscription.status === 'grace_period'
                  ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
                  : 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
              }`}>
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <p className={`text-sm font-bold ${
                  subscription.status === 'active'
                    ? 'text-emerald-800 dark:text-emerald-200'
                    : subscription.status === 'grace_period'
                    ? 'text-amber-800 dark:text-amber-200'
                    : 'text-red-800 dark:text-red-200'
                }`}>
                  {subscription.status === 'active' && `Active Subscription - ${subscription.daysRemaining} days remaining`}
                  {subscription.status === 'grace_period' && `Grace Period - ${subscription.daysRemaining} days until suspension`}
                  {subscription.status === 'expired' && 'Subscription Expired'}
                  {subscription.status === 'none' && 'No Active Subscription'}
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {subscription.plan?.displayName || 'Subscribe to access full features'}
                  </p>
                    {subscription.plan?.price && (
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        ₹{subscription.plan.price}/{subscription.plan.durationDays} days
                    </span>
                  )}
                  {subscription.endDate && (
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      Expires: {new Date(subscription.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate('/merchant/subscription')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                subscription.status === 'active'
                  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60'
                  : 'bg-primary hover:bg-primary-dark text-white'
              } btn-press`}
            >
              {subscription.status === 'none' ? 'Subscribe Now' : 'Renew Now'}
            </button>
          </div>
          {subscription.status === 'active' && subscription.daysRemaining <= 15 && subscription.daysRemaining > 3 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 ml-10">
              ?? Renew before {new Date(subscription.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} to avoid service interruption.
            </p>
          )}
        </div>
      )}

      {/* Expiring Soon Banner — dismissible, 3-day window */}
      {!subscriptionLoading && subscription?.status === 'active' && subscription?.endDate && !dismissedExpiryBanner && (() => {
        const daysLeft = Math.ceil((new Date(subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysLeft > 3) return null;
        const expiryDate = new Date(subscription.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        return (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                    Your subscription {daysLeft <= 0 ? 'expired on' : 'expires on'} {expiryDate} — renew now
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                    {daysLeft <= 0 ? 'Expires today' : daysLeft === 1 ? 'Expires tomorrow' : `Expires in ${daysLeft} days`} to avoid service interruption.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/merchant/subscription')}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm btn-press"
                >
                  Renew Now
                </button>
                <button
                  onClick={() => setDismissedExpiryBanner(true)}
                  className="p-1.5 text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 transition-colors btn-press"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Top Section: Wallet + Stats Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Merchant Wallet Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-800 text-white rounded-3xl p-6 shadow-lg shadow-emerald-500/10 border border-emerald-500/20 flex flex-col justify-between">
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-6 translate-y-6 pointer-events-none">
            <Wallet className="w-48 h-48" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider opacity-85">Merchant Points Wallet</span>
            <p className="text-4xl font-black mt-2 tracking-tight">
              {(stats?.pointsBalance || 0).toLocaleString('en-IN')}{' '}
              <span className="text-sm font-medium tracking-normal opacity-85">pts</span>
            </p>
          </div>
          <button
            onClick={() => navigate('/merchant/add-points')}
            className="mt-6 w-full py-2.5 bg-white hover:bg-emerald-50 hover:bg-opacity-90 text-emerald-800 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-xs font-black btn-press"
          >
            <QrCode className="w-4 h-4" />
            Scan Customer QR
          </button>
        </div>

        {/* Stats Grid */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <StatCard
            icon={Users}
            label="Today's Customers"
            value={stats?.todayCustomers || 0}
          />
          <StatCard
            icon={Layers}
            label="Today's Transactions"
            value={stats?.todayTransactions || 0}
          />
          <StatCard
            icon={ArrowUpRight}
            label="Points Issued Today"
            value={(stats?.pointsIssuedToday || 0).toLocaleString('en-IN')}
          />
          <StatCard
            icon={ArrowDownLeft}
            label="Points Redeemed Today"
            value={(stats?.pointsRedeemedToday || 0).toLocaleString('en-IN')}
          />
        </div>
      </div>

      {/* Customer Onboarding & Insights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Onboarding QR Code Card */}
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-between text-center min-h-[320px]">
          <div className="w-full">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-base text-slate-800 dark:text-white">Your Customer Onboarding Code</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-[240px] mx-auto">
              Display this QR code to onboarding customers or copy the registration link.
            </p>
            
            <div className="flex justify-center mt-5 mb-4">
              <div className="bg-white p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">
                {stats?.merchantCode ? (
                  <QRCodeSVG
                    value={`${import.meta.env.VITE_APP_URL || window.location.origin}/register?mcode=${stats.merchantCode}`}
                    size={130}
                    level="M"
                    includeMargin={false}
                  />
                ) : (
                  <div className="w-[130px] h-[130px] flex items-center justify-center text-slate-400 text-xs font-semibold">
                    Generating Code...
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="w-full space-y-2">
            {stats?.merchantCode && (
              <span className="block text-xs font-mono font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 truncate">
                {stats.merchantCode}
              </span>
            )}
            <button
              onClick={() => {
                if (stats?.merchantCode) {
                  const link = `${import.meta.env.VITE_APP_URL || window.location.origin}/register?mcode=${stats.merchantCode}`;
                  navigator.clipboard.writeText(link);
                  toast.success('Onboarding link copied!');
                }
              }}
              disabled={!stats?.merchantCode}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 btn-press"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Onboarding Link
            </button>
          </div>
        </div>

        {/* Customer Insights Card */}
        <div className="lg:col-span-2 bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-base text-slate-800 dark:text-white">Customer Insights</h3>
              </div>
              <span className="text-[10px] uppercase font-extrabold text-[#00bcd4] tracking-widest bg-[#00bcd4]/10 px-2.5 py-1 rounded">
                Network Stats
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              Insights on how customers discovered your business via direct sign-ups or shared network effects.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm text-center">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Customers You've Personally Signed Up
                </span>
                <span className="text-3xl font-extrabold text-slate-800 dark:text-white mt-2 block">
                  {insightsLoading ? '...' : (insights?.signedUpByMe ?? insights?.totalCustomers ?? 0)}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm text-center">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Repeat Customers
                </span>
                <span className="text-3xl font-extrabold text-[#00bcd4] mt-2 block">
                  {insightsLoading ? '...' : (insights?.repeatCustomers ?? 0)}
                </span>
              </div>
            </div>
          </div>

          {ecosystemStats && ecosystemStats.totalCustomers > 5 && (
            <p className="text-[10.5px] text-slate-400 mt-3">
              <Users className="w-3 h-3 inline-block -mt-0.5" /> {ecosystemStats.activeCustomers.toLocaleString('en-IN')} Active Customers
              {' · '}
              <Users className="w-3 h-3 inline-block -mt-0.5" /> {ecosystemStats.activeMerchants.toLocaleString('en-IN')} Active Merchants
              {' · '}
              <ArrowUpRight className="w-3 h-3 inline-block -mt-0.5" /> {ecosystemStats.newCustomersLast30Days.toLocaleString('en-IN')} New This Month
            </p>
          )}
        </div>
      </div>

      {/* Quick Action Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          onClick={() => navigate('/merchant/add-points')}
          className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm hover:shadow-md cursor-pointer transition-all flex items-start gap-4"
        >
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-2xl">
            <PlusCircle className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Issue Loyalty Points</h3>
            <p className="text-sm text-slate-400 dark:text-slate-400 mt-1">
              Add points based on purchase transaction values. Rate configured by admin.
            </p>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline mt-4">
              Allocate Points Now &rarr;
            </span>
          </div>
        </div>

        <div
          onClick={() => navigate('/merchant/redeem-points')}
          className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm hover:shadow-md cursor-pointer transition-all flex items-start gap-4"
        >
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <Gift className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Redeem Points</h3>
            <p className="text-sm text-slate-400 dark:text-slate-400 mt-1">
              Deduct points to apply cash discount at check-out. Rate configured by admin.
            </p>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary hover:underline mt-4">
              Redeem Discount Now &rarr;
            </span>
          </div>
        </div>

        <div
          onClick={() => setIsComplaintModalOpen(true)}
          className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm hover:shadow-md cursor-pointer transition-all flex items-start gap-4"
        >
          <div className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-2xl">
            <MessageSquare className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Complaints & Feedback</h3>
            <p className="text-sm text-slate-400 dark:text-slate-400 mt-1">
              Having trouble with customer disputes, payouts, or tech? Submit a report.
            </p>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:underline mt-4">
              Submit Feedback Now &rarr;
            </span>
          </div>
        </div>
      </div>

      {/* Recent Transactions list */}
      <div className="space-y-4">

        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white">Recent Transactions</h3>
          <Link
            to="/merchant/transactions"
            className="text-xs font-bold text-primary hover:underline"
          >
            View Full Log &rarr;
          </Link>
        </div>

        <DataTable
          columns={[
            {
              header: 'Date',
              accessor: 'createdAt',
              render: (row) => new Date(row.createdAt).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            },
            {
              header: 'Customer Name',
              accessor: (row) => row.customer?.name || 'N/A'
            },
            {
              header: 'Customer Mobile',
              accessor: (row) => row.customer?.user?.mobile || row.customer?.mobile || 'N/A'
            },
            {
              header: 'Type',
              accessor: 'type',
              render: (row) => <Badge type={row.type}>{row.type}</Badge>
            },
            {
              header: 'Amount',
              accessor: 'purchaseAmount',
              render: (row) => row.purchaseAmount ? `₹${parseFloat(row.purchaseAmount).toLocaleString('en-IN')}` : '-'
            },
            {
              header: 'Points',
              accessor: 'points',
              render: (row) => (
                <span className={`font-bold ${row.type === 'earn' ? 'text-emerald-600' : 'text-amber-500'}`}>
                  {row.type === 'earn' ? '+' : '-'}{row.points}
                </span>
              )
            },
            {
              header: 'Status',
              accessor: 'status',
              render: (row) => <Badge type={row.status}>{row.status}</Badge>
            }
          ]}
          data={recentTransactions}
        />
      </div>

      {/* COMPLAINT MODAL */}
      <ComplaintModal
        isOpen={isComplaintModalOpen}
        onClose={() => setIsComplaintModalOpen(false)}
        complaintTypes={['Payout Issue', 'Customer Dispute', 'Technical Problem', 'Other']}
        apiEndpoint="/api/merchant/complaint"
        defaultType="Payout Issue"
      />

      </div>
  );
}
