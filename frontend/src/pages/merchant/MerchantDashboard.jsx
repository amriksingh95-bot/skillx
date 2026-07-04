import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Camera,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  User,
  Mail,
  MessageSquare,
  X,
  Copy,
  Share2,
  CreditCard,
  Store,
  Scissors,
  Laptop,
  Pill,
  Shirt,
  Wrench,
  Car,
  BookOpen,
  Coffee,
  Pizza,
  Heart,
  Home
} from 'lucide-react';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import DataTable from '../../components/DataTable';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import Modal from '../../components/Modal';
import AdBanner from '../../components/AdBanner';
import ComplaintModal from '../../components/ComplaintModal';
import { THEMES, ICONS } from '../../constants/adThemes';
import gpayQR from '../../assets/gpay-qr.png';

export default function MerchantDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  // Subscription State
  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  // Promote Business / Ads States
  const [myAds, setMyAds] = useState([]);
  const [adTitle, setAdTitle] = useState('');
  const [adDescription, setAdDescription] = useState('');
  const [adImageUrl, setAdImageUrl] = useState('');
  const [adCtaText, setAdCtaText] = useState('Learn More');
  const [adCtaLink, setAdCtaLink] = useState('');
  const [adPackage, setAdPackage] = useState('starter');
  const [adShowDirections, setAdShowDirections] = useState(true);
  const [adTheme, setAdTheme] = useState('green');
  const [adIcon, setAdIcon] = useState('store');
  const [submittingAd, setSubmittingAd] = useState(false);
  const [fileKey, setFileKey] = useState(Date.now());
  const [editingAdId, setEditingAdId] = useState(null);

// Ad Payment States
  const [payingAdId, setPayingAdId] = useState(null);
  const [adPaymentId, setAdPaymentId] = useState(null);
  const [adScreenshot, setAdScreenshot] = useState(null);
  const [adPaymentSubmitting, setAdPaymentSubmitting] = useState(false);
  const [adPaymentUpiId, setAdPaymentUpiId] = useState('');
  const [adPaymentAmount, setAdPaymentAmount] = useState(0);

  // Transfer Flow States
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [transferStep, setTransferStep] = useState(1);
  const [scannedCustomer, setScannedCustomer] = useState(null);
  const [pointsToTransfer, setPointsToTransfer] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(true);
  const [mockQr, setMockQr] = useState('');

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/api/merchant/dashboard');
      setStats(res.data.data.stats);
      setRecentTransactions(res.data.data.recentTransactions);
    } catch (err) {
      toast.error('Failed to load merchant dashboard statistics.');
    }
  };

  const fetchMyAds = async () => {
    try {
      const res = await api.get('/api/merchant/ads');
      setMyAds(res.data.data || []);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
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

  const fetchSubscription = async () => {
    try {
      setSubscriptionLoading(true);
      const res = await api.get('/api/merchant/subscription');
      setSubscription(res.data.data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate type (jpg/png only)
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast.error('Only JPG and PNG images are allowed.');
      e.target.value = '';
      return;
    }

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAdImageUrl(reader.result);
    };
    reader.onerror = () => {
      toast.error('Failed to read file.');
    };
    reader.readAsDataURL(file);
  };

  const handleEditAd = (ad) => {
    setAdTitle(ad.title);
    setAdDescription(ad.description || '');
    setAdImageUrl(ad.imageUrl || '');
    setAdCtaText(ad.ctaText || 'Learn More');
    setAdCtaLink(ad.ctaLink || '');
    setAdPackage(ad.package);
    setAdShowDirections(ad.showDirections ?? true);
    const matchedTheme = Object.keys(THEMES).find(k => THEMES[k].bg === ad.bg);
    setAdTheme(matchedTheme || 'green');
    setAdIcon(ad.icon || 'store');
    setEditingAdId(ad.id);
    const formEl = document.getElementById('ad-form-container');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleDeleteAd = async (id) => {
    if (!window.confirm('Are you sure you want to delete this advertisement?')) {
      return;
    }
    try {
      const res = await api.delete(`/api/merchant/ads/${id}`);
      toast.success(res.data.message || 'Advertisement deleted successfully.');
      fetchMyAds();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete advertisement.';
      toast.error(msg);
    }
  };

  const handleRepostAd = (ad) => {
    setAdTitle(ad.title);
    setAdDescription(ad.description || '');
    setAdImageUrl(ad.imageUrl || '');
    setAdCtaText(ad.ctaText || 'Learn More');
    setAdCtaLink(ad.ctaLink || '');
    setAdPackage(ad.package);
    setAdShowDirections(ad.showDirections ?? true);
    const matchedTheme = Object.keys(THEMES).find(k => THEMES[k].bg === ad.bg);
    setAdTheme(matchedTheme || 'green');
    setAdIcon(ad.icon || 'store');
    setEditingAdId(null);
    toast.success('Ad details loaded. Submit below to create a new campaign.');
    const formEl = document.getElementById('ad-form-container');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCancelEdit = () => {
    setAdTitle('');
    setAdDescription('');
    setAdImageUrl('');
    setAdCtaText('Learn More');
    setFileKey(Date.now());
    setAdCtaLink('');
    setAdPackage('starter');
    setAdShowDirections(true);
    setAdTheme('green');
    setAdIcon('store');
    setEditingAdId(null);
  };

  const handleRequestAdPayment = async (adId) => {
    setPayingAdId(adId);
    setAdPaymentId(null);
    setAdScreenshot(null);
    try {
      const res = await api.post('/api/merchant/ad-payment/request', { advertisementId: adId });
      setAdPaymentId(res.data.data.paymentId);
      setAdPaymentUpiId(res.data.data.upiId || '');
      setAdPaymentAmount(res.data.data.amountPaid || 0);
      toast.success('Payment request created. Upload your payment screenshot.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create payment request.');
      setPayingAdId(null);
    }
  };

  const handleUploadAdPaymentScreenshot = async (e) => {
    e.preventDefault();
    if (!adScreenshot || !adPaymentId) return;
    setAdPaymentSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('screenshot', adScreenshot);
      await api.post(`/api/merchant/ad-payment/upload-screenshot/${adPaymentId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Screenshot uploaded. Admin will verify within 24 hours.');
      setPayingAdId(null);
      setAdPaymentId(null);
      setAdScreenshot(null);
      await fetchMyAds();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload screenshot.');
    } finally {
      setAdPaymentSubmitting(false);
    }
  };

  const handleCreateAdSubmit = async (e) => {
    e.preventDefault();
    if (!adTitle.trim() || !adPackage) {
      return toast.error('Please fill in all required fields.');
    }

    setSubmittingAd(true);
    try {
      const payload = {
        title: adTitle,
        description: adDescription,
        imageUrl: adImageUrl,
        ctaText: adCtaText,
        ctaLink: adCtaLink,
        package: adPackage,
        showDirections: adShowDirections,
        bg: THEMES[adTheme].bg,
        accent: THEMES[adTheme].accent,
        icon: adIcon
      };

      if (editingAdId) {
        const res = await api.put(`/api/merchant/ads/${editingAdId}`, payload);
        toast.success(res.data.message || 'Advertisement updated successfully.');
        setEditingAdId(null);
      } else {
        const res = await api.post('/api/merchant/ads', payload);
        toast.success(res.data.message || "Ad submitted for approval. We'll review within 24 hours.");
      }
      
      // Clear form fields
      setAdTitle('');
      setAdDescription('');
      setAdImageUrl('');
      setAdCtaText('Learn More');
      setFileKey(Date.now());
      setAdCtaLink('');
      setAdPackage('starter');
      setAdShowDirections(true);
      setAdTheme('green');
      setAdIcon('store');

      // Refresh ad listings
      await fetchMyAds();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit advertisement.';
      toast.error(msg);
    } finally {
      setSubmittingAd(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await Promise.allSettled([fetchDashboardData(), fetchMyAds(), fetchCustomerInsights(), fetchSubscription()]);
    } finally {
      setLoading(false);
      toast.success('Stats updated!');
    }
  };

  useEffect(() => {
    const initData = async () => {
      try {
        await Promise.allSettled([fetchDashboardData(), fetchMyAds(), fetchCustomerInsights(), fetchSubscription()]);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  const handleQrScanSuccess = async (decodedText) => {
    setShowScanner(false);
    await lookupCustomerByQR(decodedText);
  };

  // HTML5 QR Scanner Effect
  const handleQrScanSuccessRef = useRef(handleQrScanSuccess);
  handleQrScanSuccessRef.current = handleQrScanSuccess;

  useEffect(() => {
    let scanner = null;
    let cancelled = false;
    if (isTransferModalOpen && showScanner && transferStep === 1) {
      const timer = setTimeout(async () => {
        if (cancelled) return;
        try {
          const { Html5QrcodeScanner: Html5QrcodeScannerCls } = await import('html5-qrcode');
          if (cancelled) return;
          scanner = new Html5QrcodeScannerCls(
            'merchant-transfer-qr-reader',
            { fps: 10, qrbox: 250 },
            /* verbose= */ false
          );
          scanner.render(
            (text) => {
              scanner.clear();
              handleQrScanSuccessRef.current(text);
            },
            (err) => {
              console.warn('QR scan error:', err);
            }
          );
        } catch (e) {
          console.warn('QR init error:', e);
        }
      }, 300);

      return () => {
        cancelled = true;
        clearTimeout(timer);
        if (scanner) {
          scanner.clear().catch(() => {});
        }
      };
    }
  }, [isTransferModalOpen, showScanner, transferStep]);

  const lookupCustomerByQR = async (qrString) => {
    setTransferLoading(true);
    try {
      const res = await api.get(`/api/merchant/customer-by-qr/${qrString}`);
      // Now also fetch the customer's current points balance using the scanner endpoint or identifier lookup
      const balanceRes = await api.get(`/api/merchant/customer/${res.data.data.id}`);
      setScannedCustomer({
        ...res.data.data,
        balance: balanceRes.data.data.balance
      });
      setTransferStep(2);
      toast.success(`Customer found: ${res.data.data.name}`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Customer not found.';
      toast.error(msg);
      setShowScanner(true);
    } finally {
      setTransferLoading(false);
    }
  };

  const handleMockScanSubmit = (e) => {
    e.preventDefault();
    if (!mockQr) return toast.error('Paste a QR string first.');
    handleQrScanSuccess(mockQr);
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!scannedCustomer) return;
    const pointsInt = parseInt(pointsToTransfer);
    if (isNaN(pointsInt) || pointsInt <= 0) {
      return toast.error('Please enter a valid points amount.');
    }
    if (pointsInt > (stats?.pointsBalance || 0)) {
      return toast.error('Insufficient points in your merchant wallet.');
    }

    setTransferLoading(true);
    try {
      await api.post('/api/merchant/transfer-points', {
        customerId: scannedCustomer.id,
        points: pointsInt
      });
      // Refresh dashboard stats
      await fetchDashboardData();
      setTransferStep(3);
      toast.success(`Successfully transferred ${pointsInt} points!`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to transfer points.';
      toast.error(msg);
    } finally {
      setTransferLoading(false);
    }
  };

  const handleResetTransfer = () => {
    setScannedCustomer(null);
    setPointsToTransfer('');
    setMockQr('');
    setTransferStep(1);
    setShowScanner(true);
  };

  const handleCloseTransferModal = () => {
    setIsTransferModalOpen(false);
    handleResetTransfer();
  };

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
          className="px-6 py-2.5 bg-primary text-white font-extrabold rounded-xl transition-all hover:bg-primary-dark shadow-sm text-xs"
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
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">Merchant Station</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track customer transactions and manage point allocations.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="p-3 bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm flex items-center justify-center gap-2 text-sm font-semibold shrink-0"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
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
                    {subscription.subscription?.plan?.displayName || 'Subscribe to access full features'}
                  </p>
                  {subscription.subscription?.plan?.price && (
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      ₹{subscription.subscription.plan.price}/{subscription.subscription.plan.durationDays} days
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
              }`}
            >
              {subscription.status === 'none' ? 'Subscribe Now' : 'Renew Now'}
            </button>
          </div>
          {subscription.status === 'active' && subscription.daysRemaining <= 15 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 ml-10">
              ⚠️ Renew before {new Date(subscription.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} to avoid service interruption.
            </p>
          )}
        </div>
      )}

      {/* Top Section: Wallet + Stats Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Merchant Wallet Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-800 text-white rounded-3xl p-6 shadow-lg shadow-emerald-500/10 flex flex-col justify-between">
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-6 translate-y-6">
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
            onClick={() => {
              setIsTransferModalOpen(true);
              setTransferStep(1);
              setShowScanner(true);
            }}
            className="mt-6 w-full py-2.5 bg-white hover:bg-emerald-50 hover:bg-opacity-90 text-emerald-800 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-xs font-black"
          >
            <QrCode className="w-4 h-4" />
            Scan Customer QR
          </button>
        </div>

        {/* Stats Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-3xl p-6 shadow-sm flex flex-col items-center justify-between text-center min-h-[320px]">
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
              <span className="block text-xs font-mono font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-dark-border truncate">
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
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Onboarding Link
            </button>
          </div>
        </div>

        {/* Customer Insights Card */}
        <div className="lg:col-span-2 bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-3xl p-6 shadow-sm flex flex-col justify-between">
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
              <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-dark-border rounded-2xl p-5 shadow-sm text-center">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Customers You've Personally Signed Up
                </span>
                <span className="text-3xl font-extrabold text-slate-800 dark:text-white mt-2 block">
                  {insightsLoading ? '...' : (insights?.signedUpByMe ?? insights?.totalCustomers ?? 0)}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-dark-border rounded-2xl p-5 shadow-sm text-center">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Customers Brought to You by the Network
                </span>
                <span className="text-3xl font-extrabold text-[#00bcd4] mt-2 block">
                  {insightsLoading ? '...' : (insights?.fromNetwork ?? insights?.repeatCustomers ?? 0)}
                </span>
              </div>
            </div>
          </div>

          <p className="text-[10.5px] text-slate-400 leading-relaxed mt-6 border-t border-slate-100 dark:border-slate-800 pt-4">
            ℹ️ <strong>Network Effect:</strong> Customers brought by the network shopped at your store but originally signed up via other merchants or sources. The larger the network grows, the more customers discover your brand!
          </p>
        </div>
      </div>

      {/* Quick Action Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          onClick={() => navigate('/merchant/add-points')}
          className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-3xl p-6 shadow-sm hover:shadow-md cursor-pointer transition-all flex items-start gap-4"
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
          className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-3xl p-6 shadow-sm hover:shadow-md cursor-pointer transition-all flex items-start gap-4"
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
          className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-3xl p-6 shadow-sm hover:shadow-md cursor-pointer transition-all flex items-start gap-4"
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

      {/* Promote Your Business Section */}
      <div className="space-y-6 pt-6 border-t border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <span>🚀</span> Promote your business
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Display premium banner advertisements to platform members and drive customer footfall.
          </p>
        </div>

        {/* Ad Packages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`p-5 rounded-3xl bg-slate-900 border transition-all cursor-pointer ${adPackage === 'starter' ? 'border-[#00bcd4] shadow-md shadow-cyan-500/10' : 'border-slate-800 hover:border-slate-700'}`} onClick={() => setAdPackage('starter')}>
            <span className="text-[10px] uppercase font-extrabold text-[#00bcd4] tracking-widest block">Basic Visibility</span>
            <h4 className="text-lg font-black text-white mt-1">Starter Pack</h4>
            <div className="text-2xl font-black mt-2 text-white">₹499 <span className="text-xs font-normal text-slate-400">/ 7 days</span></div>
            <p className="text-xs text-slate-400 mt-4 leading-relaxed">
              ⭐ Estimated reach: <strong className="text-white">5,000 - 10,000</strong> impressions. Perfect for launch offers.
            </p>
          </div>

          <div className={`p-5 rounded-3xl bg-slate-900 border transition-all cursor-pointer ${adPackage === 'growth' ? 'border-[#00bcd4] shadow-md shadow-cyan-500/10' : 'border-slate-800 hover:border-slate-700'}`} onClick={() => setAdPackage('growth')}>
            <span className="text-[10px] uppercase font-extrabold text-amber-400 tracking-widest block">Popular Choice</span>
            <h4 className="text-lg font-black text-white mt-1">Growth Pack</h4>
            <div className="text-2xl font-black mt-2 text-white">₹999 <span className="text-xs font-normal text-slate-400">/ 15 days</span></div>
            <p className="text-xs text-slate-400 mt-4 leading-relaxed">
              🔥 Estimated reach: <strong className="text-white">15,000 - 25,000</strong> impressions. Ideal for regular promos.
            </p>
          </div>

          <div className={`p-5 rounded-3xl bg-slate-900 border transition-all cursor-pointer ${adPackage === 'premium' ? 'border-[#00bcd4] shadow-md shadow-cyan-500/10' : 'border-slate-800 hover:border-slate-700'}`} onClick={() => setAdPackage('premium')}>
            <span className="text-[10px] uppercase font-extrabold text-violet-400 tracking-widest block">Maximum Impact</span>
            <h4 className="text-lg font-black text-white mt-1">Premium Pack</h4>
            <div className="text-2xl font-black mt-2 text-white">₹1,999 <span className="text-xs font-normal text-slate-400">/ 30 days</span></div>
            <p className="text-xs text-slate-400 mt-4 leading-relaxed">
              👑 Estimated reach: <strong className="text-white">40,000 - 60,000</strong> impressions. High rotation visibility.
            </p>
          </div>
        </div>

        {/* Ad Creation Form */}
        <div id="ad-form-container" className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-3xl p-6 shadow-sm">
          <h3 className="font-bold text-base text-slate-800 dark:text-white mb-4">
            {editingAdId ? 'Edit Advertisement Campaign' : 'Submit New Advertisement'}
          </h3>
          <form onSubmit={handleCreateAdSubmit} className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Campaign Title *</label>
                <input
                  type="text" required
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white"
                  placeholder="e.g. 20% Off Weekend Sale!"
                  value={adTitle}
                  onChange={(e) => setAdTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Campaign Package *</label>
                <div className="flex items-center gap-6 py-2.5">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input type="radio" name="adPackage" value="starter" checked={adPackage === 'starter'} onChange={(e) => setAdPackage(e.target.value)} />
                    Starter
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input type="radio" name="adPackage" value="growth" checked={adPackage === 'growth'} onChange={(e) => setAdPackage(e.target.value)} />
                    Growth
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input type="radio" name="adPackage" value="premium" checked={adPackage === 'premium'} onChange={(e) => setAdPackage(e.target.value)} />
                    Premium
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description / Offer Details</label>
              <textarea
                rows={3}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white resize-none"
                placeholder="Briefly describe what your offer is, e.g. Valid on all orders above ₹500. Show coupon code at counter."
                value={adDescription}
                onChange={(e) => setAdDescription(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Brand Theme</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(THEMES).map(([key, theme]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAdTheme(key)}
                    className={`w-10 h-10 rounded-full transition-all`}
                    style={{
                      background: theme.bg,
                      border: adTheme === key ? '3px solid white' : '2px solid transparent',
                      boxShadow: adTheme === key ? '0 0 0 2px #000' : 'none',
                    }}
                    title={key}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Business Icon</label>
              <div className="grid grid-cols-6 gap-2">
                {ICONS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAdIcon(key)}
                    className={`p-3 rounded-xl transition-all flex flex-col items-center justify-center text-xs ${adIcon === key ? 'border-2 border-cyan-400 bg-cyan-50/20' : 'border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    title={label}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                ))}
              </div>
            </div>

            {/* Live Preview */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Live Preview</label>
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-2 bg-slate-50 dark:bg-slate-800/30">
                <div
                  style={{
                    height: 160,
                    display: 'grid',
                    gridTemplateColumns: '36px 200px 1fr 100px 36px',
                    gap: '12px',
                    padding: '0 12px',
                    background: THEMES[adTheme].bg,
                  }}
                  className="ad-preview-grid"
                >
                  <style>{`
                    @media (max-width: 640px) {
                      .ad-preview-grid {
                        grid-template-columns: 36px 1fr 36px !important;
                        grid-template-rows: auto auto !important;
                      }
                      .ad-preview-grid > div:nth-child(1) { grid-column: 1; }
                      .ad-preview-grid > div:nth-child(2) { grid-column: 2 / -1; }
                      .ad-preview-grid > div:nth-child(3) { grid-column: 2; }
                      .ad-preview-grid > div:nth-child(4) { grid-column: 2 / -1; grid-row: 2; justify-self: end; margin-right: 36px; }
                      .ad-preview-grid > div:nth-child(5) { grid-column: 3; }
                    }
                  `}</style>

                  {/* Arrow spacer */}
                  <div></div>

                  {/* Brand identity - use stats for merchant info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 10,
                        background: THEMES[adTheme].accent + '33',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                        flexShrink: 0,
                        border: `1px solid ${THEMES[adTheme].accent}66`,
                        overflow: 'hidden'
                      }}
                    >
                      {adImageUrl ? (
                        <img src={adImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span>{adIcon === 'store' ? '🏪' : adIcon === 'scissors' ? '✂️' : adIcon === 'device-laptop' ? '💻' : adIcon === 'pill' ? '💊' : adIcon === 'shirt' ? '👕' : adIcon === 'tools' ? '🛠️' : adIcon === 'car' ? '🚗' : adIcon === 'book' ? '📚' : adIcon === 'coffee' ? '☕' : adIcon === 'pizza' ? '🍕' : adIcon === 'heart' ? '❤️' : adIcon === 'home' ? '🏠' : '🏪'}</span>
                      )}
                    </div>
                    <div style={{ minWidth: 0, flex: '1 1 auto', maxWidth: '100%' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        Your Business Name
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', whiteSpace: 'normal', wordBreak: 'break-word', marginTop: 2 }}>
                        Location not set
                      </div>
                    </div>
                  </div>

                  {/* Headline */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 600, color: '#fff', lineHeight: 1.3, width: '100%', textAlign: 'center' }}>
                      {adTitle || 'Your Ad Headline'}
                    </div>
                  </div>

                  {/* Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                        fontSize: (adCtaText || 'Learn More').length > 10 ? 12 : 14,
                        lineHeight: 1.15,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        padding: 8,
                      }}
                    >
                      {adCtaText || 'Learn More'}
                    </button>
                  </div>

                  {/* Arrow spacer */}
                  <div></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Banner Image (Optional, JPG/PNG, Max 2MB)</label>
                <input
                  key={fileKey}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  onChange={handleFileChange}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
                {adImageUrl && (
                  <div className="mt-3 relative inline-block">
                    <img
                      src={adImageUrl}
                      alt="Banner Preview"
                      className="max-h-28 rounded-xl object-cover border border-slate-200 dark:border-dark-border shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setAdImageUrl('');
                        setFileKey(Date.now());
                      }}
                      className="absolute -top-2 -right-2 p-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full transition-colors shadow-md"
                      title="Remove image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">CTA Button Text</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white"
                  placeholder="Learn More"
                  value={adCtaText}
                  onChange={(e) => setAdCtaText(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">CTA Destination Link (URL)</label>
              <input
                type="url"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white"
                placeholder="https://example.com/offer-page"
                value={adCtaLink}
                onChange={(e) => setAdCtaLink(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="ad-show-directions"
                checked={adShowDirections}
                onChange={(e) => setAdShowDirections(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <label htmlFor="ad-show-directions" className="text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                Show "Get Directions" on this ad
              </label>
            </div>

            <div className="flex gap-4">
              {editingAdId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex-1 py-3 border border-slate-200 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-black rounded-xl transition-all"
                >
                  Cancel Edit
                </button>
              )}
              <button
                type="submit"
                disabled={submittingAd}
                className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-slate-950 text-sm font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                {submittingAd ? <span className="w-5 h-5 border-2 border-slate-950 border-t-transparent animate-spin rounded-full" /> : null}
                {editingAdId ? 'Update Ad' : 'Submit Ad for Approval'}
              </button>
            </div>
          </form>
        </div>

        {/* Existing Ads Table */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white">My Advertisements</h3>
          <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-2xl shadow-sm overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-dark-border">
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Title</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Package</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Impressions</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Clicks</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Duration</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Actions</th>
                  </tr>
                </thead>
<tbody className="divide-y divide-slate-100 dark:divide-dark-border text-slate-700 dark:text-slate-300">
                  {myAds.length > 0 ? (
                    myAds.map((ad) => {
                      let badgeClass = 'bg-slate-500/10 text-slate-400 border border-slate-800';
                      if (ad.status === 'pending') badgeClass = 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
                      if (ad.status === 'approved') badgeClass = 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
                      if (ad.status === 'rejected') badgeClass = 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
                      if (ad.status === 'live') badgeClass = 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
                      if (ad.status === 'paused') badgeClass = 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
                      if (ad.status === 'queued') badgeClass = 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20';

                      return (
                        <tr key={ad.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
<td className="px-6 py-4 text-sm font-semibold text-slate-800 dark:text-white">{ad.title}</td>
                         <td className="px-6 py-4 text-sm capitalize">{ad.package}</td>
                         <td className="px-6 py-4 text-sm">
                           <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide capitalize ${badgeClass}`}>{ad.status}</span>
                         </td>
                         <td className="px-6 py-4 text-sm font-bold text-slate-800 dark:text-white">{ad.impressions.toLocaleString('en-IN')}</td>
                         <td className="px-6 py-4 text-sm font-bold text-slate-800 dark:text-white">{ad.clicks.toLocaleString('en-IN')}</td>
                         <td className="px-6 py-4 text-xs text-slate-400">
                           {ad.startDate ? (
                             <span>{new Date(ad.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} - {new Date(ad.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                           ) : <span className="italic">Not scheduled</span>}
                         </td>
                          <td className="px-6 py-4 text-sm font-medium">
                            {ad.status === 'approved' && (() => {
                                const confirmed = ad.payments?.some(p => p.status === 'confirmed');
                                const pending = ad.payments?.some(p => p.status === 'pending');
                                if (confirmed) return <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-bold text-xs">🟢 Live</span>;
                                if (pending) return <span className="inline-flex items-center text-amber-600 dark:text-amber-400 font-bold text-xs">⏳ Payment Pending</span>;
                                return (
                                <button
                                      onClick={() => handleRequestAdPayment(ad.id)}
                                      disabled={payingAdId === ad.id && !adPaymentId}
                                      className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                                    >
                                      Pay Now
                                    </button>
                                  );
                              })()}
                              {ad.status === 'live' && <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-bold text-xs">🟢 Live</span>}
                              {ad.status === 'paused' && <span className="inline-flex items-center text-amber-600 dark:text-amber-400 font-bold text-xs">⏸ Paused</span>}
                              {ad.status === 'queued' && <span className="inline-flex items-center text-cyan-600 dark:text-cyan-400 font-bold text-xs">Queued</span>}
                              {ad.payments?.some(p => p.status === 'pending' && new Date(p.paidAt) < new Date(Date.now() - 3*24*60*60*1000)) && (
                                <Badge type="pending" size="sm">Verification Pending</Badge>
                              )}
                              {(ad.status === 'pending' || ad.status === 'rejected') && (
                                <div className="flex items-center gap-2.5">
                                  <button onClick={() => handleEditAd(ad)} className="text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 font-bold text-xs hover:underline">Edit</button>
                                  <span className="text-slate-300 dark:text-slate-700">|</span>
                                  <button onClick={() => handleDeleteAd(ad.id)} className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 font-bold text-xs hover:underline">Delete</button>
                                </div>
                              )}
                             {ad.status === 'expired' && (
                               <button onClick={() => handleRepostAd(ad)} className="px-2.5 py-1 text-xs font-bold text-cyan-600 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/30 dark:text-cyan-400 dark:hover:bg-cyan-900/30 border border-cyan-200/50 dark:border-cyan-900/50 rounded-lg transition-colors">Repost</button>
                             )}
                             {ad.status === 'paused' && (
                               <span className="text-xs text-slate-400 dark:text-slate-500 italic">Contact admin to resume</span>
                             )}
                           </td>
                         </tr>
                       );
                     })
                   ) : (
                     <tr>
                       <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">You have not submitted any advertisements yet.</td>
                     </tr>
                   )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-dark-border">
              {myAds.length > 0 ? (
                myAds.map((ad) => {
                  let badgeClass = 'bg-slate-500/10 text-slate-400 border border-slate-800';
                  if (ad.status === 'pending') badgeClass = 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
                  if (ad.status === 'approved') badgeClass = 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
                  if (ad.status === 'rejected') badgeClass = 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
                  if (ad.status === 'live') badgeClass = 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
                  if (ad.status === 'paused') badgeClass = 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
                  if (ad.status === 'queued') badgeClass = 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20';

                  return (
                    <div key={ad.id} className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mt-0.5">Title</span>
                        <span className="text-sm font-semibold text-slate-800 dark:text-white text-right">{ad.title}</span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mt-0.5">Package</span>
                        <span className="text-sm capitalize text-slate-700 dark:text-slate-300">{ad.package}</span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mt-0.5">Status</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide capitalize ${badgeClass}`}>{ad.status}</span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mt-0.5">Impressions</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-white">{ad.impressions.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mt-0.5">Clicks</span>
<span className="text-sm font-bold text-slate-800 dark:text-white">{ad.clicks.toLocaleString('en-IN')}</span>
                      </div>
                      {ad.startDate && (
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mt-0.5">Duration</span>
                          <span className="text-xs text-slate-400 text-right">
                            {new Date(ad.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} - {new Date(ad.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-dark-border">
                        {ad.status === 'approved' && (() => {
                          const confirmed = ad.payments?.some(p => p.status === 'confirmed');
                          const pending = ad.payments?.some(p => p.status === 'pending');
                          if (confirmed) return <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-bold text-xs">🟢 Live</span>;
                          if (pending) return <span className="inline-flex items-center text-amber-600 dark:text-amber-400 font-bold text-xs">⏳ Payment Pending</span>;
                          return (
                            <button
                              onClick={() => handleRequestAdPayment(ad.id)}
                              disabled={payingAdId === ad.id && !adPaymentId}
                              className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 rounded-lg transition-colors disabled:opacity-50"
                            >
                              Pay Now
                            </button>
);
                        })()}
                        {ad.status === 'live' && <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-bold text-xs">🟢 Live</span>}
                        {ad.status === 'paused' && <span className="inline-flex items-center text-amber-600 dark:text-amber-400 font-bold text-xs">⏸ Paused</span>}
                        {ad.status === 'queued' && <span className="inline-flex items-center text-cyan-600 dark:text-cyan-400 font-bold text-xs">Queued</span>}
                        {ad.payments?.some(p => p.status === 'pending' && new Date(p.paidAt) < new Date(Date.now() - 3*24*60*60*1000)) && (
                          <Badge type="pending" size="sm">Verification Pending</Badge>
                        )}
                        {(ad.status === 'pending' || ad.status === 'rejected') && (
                          <>
                            <button onClick={() => handleEditAd(ad)} className="text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 font-bold text-xs">Edit</button>
                            <button onClick={() => handleDeleteAd(ad.id)} className="text-rose-600 hover:text-rose-700 dark:text-rose-400 font-bold text-xs">Delete</button>
                          </>
                        )}
{ad.status === 'expired' && (
                           <button onClick={() => handleRepostAd(ad)} className="px-2.5 py-1 text-xs font-bold text-cyan-600 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/30 dark:text-cyan-400 border border-cyan-200/50 dark:border-cyan-900/50 rounded-lg transition-colors">Repost</button>
                         )}
                         {ad.status === 'paused' && (
                           <span className="text-xs text-slate-400 dark:text-slate-500 italic">Contact admin to resume</span>
                         )}
                      </div>
                    </div>
                  );
                 })
                ) : (
                  <div className="px-6 py-12 text-center text-sm text-slate-400">You have not submitted any advertisements yet.</div>
                )}
                 </div>
               </div>

      {/* Ad Payment Upload Section */}
      {payingAdId && adPaymentId && (
        <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-base text-slate-800 dark:text-white">Complete Your Payment</h3>
          <p className="text-xs text-slate-400">Scan QR code or use UPI ID to pay, then upload payment screenshot.</p>

          <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4 text-center space-y-3">
            <p className="text-xs font-medium text-slate-500">Scan & pay using any UPI app</p>
            <img
              src={gpayQR}
              alt="GPay QR Code"
              className="w-44 h-44 mx-auto rounded-lg border border-slate-200 object-contain"
            />
            <p className="text-xs text-slate-400">Scan QR code to pay ₹{adPaymentAmount.toLocaleString('en-IN')}</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">Amount</span>
              <span className="text-sm font-bold text-emerald-600">₹{adPaymentAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">UPI ID</span>
              <span className="text-sm font-bold text-slate-800 dark:text-white select-all cursor-text">{adPaymentUpiId || 'Not available'}</span>
            </div>
            {adPaymentUpiId && (
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(adPaymentUpiId)}
                className="mt-2 px-3 py-1.5 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy UPI ID
              </button>
            )}
          </div>

          <form onSubmit={handleUploadAdPaymentScreenshot} className="space-y-4">
            <img
              src={gpayQR}
              alt="GPay QR Code"
              className="w-44 h-44 mx-auto rounded-lg border border-slate-200 object-contain"
            />
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Payment Screenshot
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setAdScreenshot(e.target.files[0])}
                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
              {adScreenshot && (
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  {adScreenshot.name}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setPayingAdId(null); setAdPaymentId(null); setAdScreenshot(null); setAdPaymentUpiId(''); setAdPaymentAmount(0); }}
                className="px-4 py-2 border border-slate-200 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!adScreenshot || adPaymentSubmitting}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {adPaymentSubmitting && <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" />}
                Submit Payment Proof
              </button>
            </div>
          </form>
        </div>
      )}
      </div>

      {/* Transfer Points Modal */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={handleCloseTransferModal}
        title="Wallet-to-Wallet Points Transfer"
      >
        <div className="space-y-6">
          {/* Step Progress Bar */}
          <div className="flex items-center justify-between border border-slate-100 dark:border-dark-border rounded-2xl p-3 md:p-4 bg-slate-50 dark:bg-slate-900/20 shadow-sm mb-4">
            <div className="flex items-center gap-2 md:gap-3">
              <span className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center font-bold text-xs md:text-sm ${
                transferStep === 1 ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
              }`}>
                {transferStep > 1 ? <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" /> : '1'}
              </span>
              <span className={`text-xs md:text-sm font-bold ${transferStep === 1 ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>Scan</span>
            </div>
            <ArrowRight className="w-3 h-3 md:w-4 md:h-4 text-slate-300 shrink-0" />
            <div className="flex items-center gap-2 md:gap-3">
              <span className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center font-bold text-xs md:text-sm ${
                transferStep === 2 ? 'bg-emerald-600 text-white' : transferStep === 3 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
              }`}>
                {transferStep > 2 ? <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" /> : '2'}
              </span>
              <span className={`text-xs md:text-sm font-bold ${transferStep === 2 ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>Amount</span>
            </div>
            <ArrowRight className="w-3 h-3 md:w-4 md:h-4 text-slate-300 shrink-0" />
            <div className="flex items-center gap-2 md:gap-3">
              <span className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center font-bold text-xs md:text-sm ${
                transferStep === 3 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
              }`}>
                3
              </span>
              <span className={`text-xs md:text-sm font-bold ${transferStep === 3 ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>Status</span>
            </div>
          </div>

          {/* STEP 1: Scan View */}
          {transferStep === 1 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h3 className="font-extrabold text-base text-slate-800 dark:text-white">Scan Customer QR Code</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Scan the unique QR code on the customer's dashboard to automatically load their profile and balance.
                </p>
              </div>

              {transferLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin" />
                  <p className="text-xs font-bold text-slate-400">Identifying customer wallet...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {showScanner && (
                    <div className="border border-slate-100 dark:border-dark-border rounded-2xl p-4 bg-slate-50 dark:bg-slate-900/40">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                        <Camera className="w-4 h-4 text-emerald-600" />
                        Live Camera View
                      </div>
                      <div id="merchant-transfer-qr-reader" className="w-full max-w-sm mx-auto overflow-hidden rounded-xl bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border shadow-sm" />
                    </div>
                  )}

                  {/* Virtual testing input */}
                  <div className="pt-4 border-t border-dashed border-slate-200 dark:border-dark-border">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                      <AlertCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Virtual Testing Mode</span>
                    </div>
                    <form onSubmit={handleMockScanSubmit} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Paste QR code string (e.g. SKILLXT-8000000001)"
                        className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm placeholder-slate-400 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        value={mockQr}
                        onChange={(e) => setMockQr(e.target.value)}
                      />
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-slate-900 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl text-xs font-bold transition-all"
                      >
                        Mock Scan
                      </button>
                    </form>
                    <p className="text-[10px] text-slate-400 mt-2">
                      Use a seeded QR string (e.g. <code>SKILLXT-[CUSTOMER_UUID]</code> or copy the QR code string shown on the Customer Dashboard).
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Details & Input View */}
          {transferStep === 2 && scannedCustomer && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h3 className="font-extrabold text-base text-slate-800 dark:text-white">Customer Identified</h3>
                <p className="text-xs text-slate-400">
                  Review the customer wallet details and specify points to transfer.
                </p>
              </div>

              {/* Customer Info Card */}
              <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-dark-border p-5 rounded-2xl space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-xl font-bold">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="block text-sm font-black text-slate-900 dark:text-white">{scannedCustomer.name}</span>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                      <Mail className="w-3.5 h-3.5" />
                      <span>{scannedCustomer.email || 'No email associated'}</span>
                    </div>
                  </div>
                </div>
                <div className="h-px bg-slate-200 dark:bg-slate-800" />
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-semibold">Current Balance:</span>
                  <span className="font-black text-slate-800 dark:text-white">{(scannedCustomer.balance || 0).toLocaleString('en-IN')} pts</span>
                </div>
              </div>

              {/* Transfer Form */}
              <form onSubmit={handleTransferSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Points to Transfer
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={stats?.pointsBalance || 999999}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-lg text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold"
                    placeholder="Enter amount of points"
                    value={pointsToTransfer}
                    onChange={(e) => setPointsToTransfer(e.target.value)}
                    autoFocus
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-2 px-1">
                    <span>Your available balance: {(stats?.pointsBalance || 0).toLocaleString('en-IN')} pts</span>
                    {parseInt(pointsToTransfer) > 0 && (
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        New Merchant Balance: {((stats?.pointsBalance || 0) - parseInt(pointsToTransfer)).toLocaleString('en-IN')} pts
                      </span>
                    )}
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={handleResetTransfer}
                    className="flex-1 py-3 border border-slate-200 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition-all"
                  >
                    Back to Scan
                  </button>
                  <button
                    type="submit"
                    disabled={transferLoading || !pointsToTransfer || parseInt(pointsToTransfer) <= 0 || parseInt(pointsToTransfer) > (stats?.pointsBalance || 0)}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 hover:shadow-lg transition-all focus:outline-none flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {transferLoading ? (
                      <span className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Confirm & Transfer
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 3: Success View */}
          {transferStep === 3 && (
            <div className="text-center space-y-6 py-4 animate-scaleUp">
              <div className="inline-flex p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-full border border-emerald-100 dark:border-emerald-900/30">
                <CheckCircle2 className="w-16 h-16" />
              </div>

              <div className="space-y-2">
                <h3 className="font-extrabold text-xl text-slate-800 dark:text-white">Points Transferred Successfully!</h3>
                <p className="text-sm text-slate-400">
                  The customer has received their points in real time.
                </p>
              </div>

              {/* Receipt summary */}
              <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-dark-border p-6 rounded-2xl max-w-xs mx-auto text-left space-y-4">
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>Customer Name</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{scannedCustomer?.name}</span>
                </div>
                <div className="h-px bg-slate-200 dark:bg-slate-800" />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Points Transferred</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400 text-lg flex items-center gap-1">
                    +{pointsToTransfer} pts
                  </span>
                </div>
                <div className="h-px bg-slate-200 dark:bg-slate-800" />
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>New Merchant Balance</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{(stats?.pointsBalance || 0).toLocaleString('en-IN')} pts</span>
                </div>
              </div>

              <div className="flex gap-4 max-w-xs mx-auto pt-4">
                <button
                  type="button"
                  onClick={handleResetTransfer}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 hover:shadow-lg transition-all focus:outline-none"
                >
                  Transfer Again
                </button>
                <button
                  type="button"
                  onClick={handleCloseTransferModal}
                  className="flex-1 py-3 border border-slate-200 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* COMPLAINT MODAL */}
      <ComplaintModal
        isOpen={isComplaintModalOpen}
        onClose={() => setIsComplaintModalOpen(false)}
        complaintTypes={['Payout Issue', 'Customer Dispute', 'Technical Problem', 'Other']}
        apiEndpoint="/api/merchant/complaint"
        defaultType="Payout Issue"
      />

      </div>
    </div>
  );
}
