import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import {
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  Smartphone,
  Mail,
  User,
  Calendar,
  RefreshCw,
  QrCode,
  Copy,
  Gift,
  MessageSquare,
  AlertCircle,
  Clock,
  CreditCard
} from 'lucide-react';
import Badge from '../../components/Badge';
import DataTable from '../../components/DataTable';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import Modal from '../../components/Modal';
import {
  buildWhatsAppShareText,
  copyReferralCode
} from '../../services/referral';
import AdBanner from '../../components/AdBanner';
import ComplaintModal from '../../components/ComplaintModal';

export default function CustomerDashboard() {
  const { user, accessToken } = useAuth();
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [referralStats, setReferralStats] = useState({
    referralCode: '',
    monthlyReferrals: 0,
    totalPointsEarned: 0,
    monthlyCapRemaining: 10
  });
  const [milestones, setMilestones] = useState([]);

  const fetchReferralStats = async () => {
    try {
      const res = await api.get('/api/customer/referral-stats');
      setReferralStats(res.data.data);
    } catch (err) {
      console.error('Failed to load referral stats:', err);
    }
  };

  const fetchMilestones = async () => {
    try {
      const res = await api.get('/api/customer/milestone-progress');
      setMilestones(res.data.data);
    } catch (err) {
      console.error('Failed to load milestones:', err);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await api.get('/api/customer/profile');
      setProfile(res.data.data);
      setNewEmail(res.data.data.email || '');
    } catch (err) {
      toast.error('Failed to load profile.');
    }
  };

  const handleSaveEmail = async (e) => {
    e.preventDefault();
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return toast.error('Please enter a valid email address.');
    }

    setIsSavingEmail(true);
    try {
      await api.put('/api/customer/profile/email', { email: newEmail });
      toast.success('Email address updated successfully!');
      setProfile(prev => ({ ...prev, email: newEmail }));
      setIsEditingEmail(false);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update email address.';
      toast.error(msg);
    } finally {
      setIsSavingEmail(false);
    }
  };

  const fetchTransactions = async () => {
    setTxLoading(true);
    try {
      const res = await api.get(`/api/customer/transactions?page=${page}&limit=10&search=${search}`);
      setTransactions(res.data.data.transactions);
      setPagination(res.data.data.pagination);
    } catch (err) {
      toast.error('Failed to load transactions.');
    } finally {
      setTxLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await Promise.all([fetchProfile(), fetchTransactions(), fetchReferralStats(), fetchMilestones()]);
    setLoading(false);
    toast.success('Wallet updated!');
  };

  const handleCopyCode = async () => {
    const code = referralStats.referralCode || profile?.referralCode;
    if (!code) {
      toast.error('Referral code not available yet. Please try again later.');
      return;
    }
    try {
      await copyReferralCode(code);
      toast.success('Referral code copied!');
    } catch {
      toast.error('Could not copy. Please copy manually: ' + code);
    }
  };

  const handleWhatsApp = () => {
    const code = referralStats.referralCode || profile?.referralCode;
    if (!code) {
      toast.error('Referral code not available yet. Please try again later.');
      return;
    }
    const text = buildWhatsAppShareText(code);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  useEffect(() => {
    const initData = async () => {
      await Promise.all([fetchProfile(), fetchReferralStats(), fetchMilestones()]);
      setLoading(false);
    };
    initData();
  }, []);

  useEffect(() => {
    if (!accessToken) return;

    let eventSource = null;
    let reconnectTimer = null;

    const connectSSE = async () => {
      try {
        const tokenRes = await api.get('/api/customer/sse-token');
        const sseToken = tokenRes.data.data.sseToken;

        const sseUrl = `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'}/api/customer/notifications/stream?token=${sseToken}`;
        eventSource = new EventSource(sseUrl);

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'POINTS_RECEIVED') {
              toast.success(
                <div className="flex flex-col text-left">
                  <span className="font-bold">🎉 Points Received!</span>
                  <span className="text-xs mt-0.5">You received {data.points} points from {data.merchantName}.</span>
                </div>,
                { duration: 6000 }
              );
              fetchProfile();
              fetchTransactions();
              fetchMilestones();
            }
          } catch (err) {
          }
        };

        eventSource.onerror = () => {
          // Reconnect with a fresh SSE token after 5 seconds
          if (eventSource) eventSource.close();
          reconnectTimer = setTimeout(connectSSE, 5000);
        };
      } catch (err) {
        // Retry after 10 seconds if token fetch fails
        reconnectTimer = setTimeout(connectSSE, 10000);
      }
    };

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [accessToken]);

  useEffect(() => {
    fetchTransactions();
  }, [page, search]);

  if (loading) return <LoadingSpinner size="large" fullPage />;

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="p-3 bg-red-500/10 text-red-500 rounded-full border border-red-500/20 animate-pulse">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Failed to load dashboard</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">There was an error retrieving your profile data.</p>
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

  const columns = [
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
      header: 'Merchant',
      accessor: (row) => row.merchant.businessName
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
      header: 'Fee Breakdown',
      accessor: 'platformFee',
      render: (row) => {
        if (row.type !== 'redeem' || (!row.platformFee && !row.netAmount)) {
          return <span className="text-slate-400">—</span>;
        }
        const gross = parseFloat(row.purchaseAmount) || 0;
        const fee = parseFloat(row.platformFee) || 0;
        const net = parseFloat(row.netAmount) || 0;
        return (
          <div className="text-xs space-y-0.5">
            <div className="flex items-center gap-1 text-slate-500">
              <CreditCard className="w-3 h-3" />
              <span>Gross: ₹{gross.toLocaleString('en-IN')}</span>
            </div>
            <div className="text-amber-500">Fee: ₹{fee.toLocaleString('en-IN')}</div>
            <div className="font-bold text-emerald-600">Net: ₹{net.toLocaleString('en-IN')}</div>
          </div>
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
      <AdBanner />
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">My Loyalty Wallet</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Check your balances, display your QR code, and view your ledger.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsQrModalOpen(true)}
            className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 text-sm font-bold"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">My QR Code</span>
            <span className="sm:hidden">QR</span>
          </button>
          <button
            onClick={handleRefresh}
            className="p-3 bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm flex items-center justify-center gap-2 text-sm font-semibold"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Info Cards + QR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Profile & Balance */}
        <div className="lg:col-span-2 space-y-6">
          {/* Points Balance Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-3xl p-8 shadow-lg shadow-blue-500/20">
            {/* Background absolute decor */}
            <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-12 translate-y-12">
              <Wallet className="w-64 h-64" />
            </div>

            <div className="flex items-start justify-between">
              <div>
                <span className="text-sm font-bold uppercase tracking-wider opacity-80">Available Points Balance</span>
                <p className="text-5xl font-black mt-2 tracking-tight">
                  {(profile?.balance || 0).toLocaleString('en-IN')}{' '}
                  <span className="text-xl font-medium tracking-normal opacity-85">SkillXT Points</span>
                </p>
              </div>
              <Wallet className="w-10 h-10 opacity-90" />
            </div>

            {/* Live conversion info */}
            <div className="mt-8 pt-6 border-t border-white/20 flex flex-wrap gap-x-8 gap-y-4 text-sm font-medium opacity-90">
              <div>
                <span className="block text-xs opacity-75">Cash Value Equivalent</span>
                <span className="text-base font-bold">₹{((profile?.balance || 0) * (profile?.rewardSettings?.rupeesPerPoint ?? 0.10)).toFixed(2)} INR</span>
              </div>
              <div>
                <span className="block text-xs opacity-75">Reward Settings Rate</span>
                <span className="text-base font-bold">{profile?.rewardSettings?.minRedeemPoints ?? 100} Points = ₹{((profile?.rewardSettings?.minRedeemPoints ?? 100) * (profile?.rewardSettings?.rupeesPerPoint ?? 0.10)).toFixed(0)} Discount</span>
              </div>
            </div>
          </div>

          {/* Expiring Points Warning Banner */}
          {profile?.stats?.expiringWithin30Days > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-xl shrink-0">
                  <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-amber-800 dark:text-amber-200">
                    Points Expiring Soon!
                  </h3>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                    You have <strong>{profile.stats.expiringWithin30Days.toLocaleString('en-IN')} reward points</strong> that will expire within the next 30 days. Redeem them before they expire!
                  </p>
                  {profile.stats.expiringEntries && profile.stats.expiringEntries.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {profile.stats.expiringEntries.slice(0, 3).map((entry, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[11px] text-amber-600 dark:text-amber-400">
                          <span className="font-bold">{entry.points} pts</span>
                          <span>expires on</span>
                          <span className="font-semibold">{new Date(entry.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          <span className="text-amber-500">({entry.daysUntilExpiry} days left)</span>
                        </div>
                      ))}
                      {profile.stats.expiringEntries.length > 3 && (
                        <p className="text-[10px] text-amber-500 dark:text-amber-500">
                          +{profile.stats.expiringEntries.length - 3} more expiring entries
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Quick stats grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-2xl p-6 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <ArrowUpCircle className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Lifetime Points Earned</span>
                <span className="text-xl font-bold text-slate-800 dark:text-white mt-1 block">
                  {(profile?.stats?.lifetimeEarned || 0).toLocaleString('en-IN')} pts
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-2xl p-6 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-500 dark:text-amber-400 rounded-xl">
                <ArrowDownCircle className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Lifetime Points Redeemed</span>
                <span className="text-xl font-bold text-slate-800 dark:text-white mt-1 block">
                  {(profile?.stats?.lifetimeRedeemed || 0).toLocaleString('en-IN')} pts
                </span>
              </div>
            </div>
          </div>

          {/* Refer & Earn Card */}
          <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 rounded-lg">
                <Gift className="w-5 h-5 text-indigo-500" />
              </div>
              <h3 className="font-bold text-base text-slate-800 dark:text-white">Refer & Earn</h3>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Invite your friends to SkillXT Rewards. When they sign up using your referral code, both of you will receive <strong>20 points</strong> instantly!
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-dark-border mt-4">
              <div className="flex-1 w-full text-left">
                <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Your Unique Referral Code</span>
                <span className="font-mono text-base font-black text-slate-800 dark:text-white mt-1.5 block select-all">
                  {referralStats.referralCode || profile?.referralCode || <span className="text-slate-400 italic">Generating your code...</span>}
                </span>
              </div>
              <div className="flex flex-col gap-2 w-full sm:w-auto">
                <button
                  onClick={handleCopyCode}
                  className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy Code
                </button>
                <button
                  onClick={handleWhatsApp}
                  className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5"
                >
                  Share on WhatsApp
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-dark-border rounded-xl p-4 text-center">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">This Month's Referrals</span>
                <span className="text-xl font-extrabold text-slate-800 dark:text-white mt-1 block">
                  {referralStats.monthlyReferrals}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-dark-border rounded-xl p-4 text-center">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Points Earned from Referrals</span>
                <span className="text-xl font-extrabold text-[#00bcd4] mt-1 block">
                  +{referralStats.totalPointsEarned}
                </span>
              </div>
            </div>
          </div>

          {/* Milestones Card */}
          {milestones && milestones.length > 0 && (
            <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/20 text-blue-500 rounded-lg">
                  <Gift className="w-5 h-5 text-blue-500" />
                </div>
                <h3 className="font-bold text-base text-slate-800 dark:text-white">Milestones</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {milestones.map((m) => (
                  <div 
                    key={m.id} 
                    className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-dark-border rounded-xl flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-extrabold text-sm text-slate-800 dark:text-white">₹{m.spendTarget.toLocaleString('en-IN')} Spent</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
                          {m.bonusPoints} pts
                        </span>
                      </div>
                      <span className="block text-[10px] text-slate-400 font-semibold mt-1">Unlock {m.bonusPoints} bonus points</span>
                    </div>

                    <div className="mt-4">
                      {/* Progress Bar Container */}
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 transition-all duration-500 rounded-full" 
                          style={{ width: `${m.progressPercent}%` }} 
                        />
                      </div>

                      <div className="mt-2 text-xs font-bold">
                        {m.isUnlocked ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            ✅ Unlocked! You earned {m.bonusPoints} bonus points
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-400">
                            Spend ₹{m.amountRemaining.toLocaleString('en-IN')} more to unlock {m.bonusPoints} bonus points
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Profile metadata card */}
          <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-base text-slate-800 dark:text-white mb-4">Account Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-lg">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-xs text-slate-400">Account Name</span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{profile?.name}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-lg">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-xs text-slate-400">Mobile Connection</span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">+91 {profile?.user?.mobile || profile?.mobile}</span>
                </div>
              </div>

              <div className="flex items-start gap-3 col-span-1 md:col-span-2">
                <div className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-lg mt-1">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <span className="block text-xs text-slate-400">Email Address</span>
                  {isEditingEmail || !profile?.email ? (
                    <form onSubmit={handleSaveEmail} className="mt-1 flex items-center gap-2 max-w-md">
                      <input
                        type="email"
                        required
                        disabled={isSavingEmail}
                        className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-lg text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                        placeholder="Enter your email address"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                      />
                      <button
                        type="submit"
                        disabled={isSavingEmail}
                        className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                      >
                        {isSavingEmail ? 'Saving...' : 'Save'}
                      </button>
                      {profile?.email && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingEmail(false);
                            setNewEmail(profile.email || '');
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </form>
                  ) : (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {profile.email}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsEditingEmail(true)}
                        className="text-xs text-primary hover:underline font-bold"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-lg">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-xs text-slate-400">Member Since</span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {new Date(profile?.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* QR Code Presentation Box */}
          <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 rounded-2xl mb-4">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-800 dark:text-white">Scan My QR Code</h3>
            <p className="text-xs text-slate-400 dark:text-slate-400 mt-1 max-w-[200px]">
              Present this QR code to the merchant to easily earn or redeem points.
            </p>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-inner mt-6 dark:border-slate-800 dark:bg-white">
              {profile?.qrCode ? (
                <QRCodeSVG
                  value={profile.qrCode}
                  size={160}
                  level="M"
                  includeMargin={false}
                />
              ) : null}
            </div>

            <span className="text-xs font-mono font-semibold text-slate-400 mt-4 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-dark-border">
              {profile?.qrCode}
            </span>
          </div>

          {/* Complaints & Feedback Presentation Box */}
          <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-2xl mb-4">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-800 dark:text-white">Complaints & Feedback</h3>
            <p className="text-xs text-slate-400 dark:text-slate-400 mt-1 max-w-[200px]">
              Have an issue with payments, points, or the app? Submit a feedback report.
            </p>
            <button
              onClick={() => setIsComplaintModalOpen(true)}
              className="w-full mt-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-md shadow-rose-500/10 transition-colors"
            >
              Submit Complaint or Feedback
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table Section */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg text-slate-800 dark:text-white">My Transactions History</h3>
        <DataTable
          columns={columns}
          data={transactions}
          pagination={pagination}
          onPageChange={setPage}
          searchPlaceholder="Search by merchant name or remarks..."
          onSearchChange={setSearch}
          searchValue={search}
          isLoading={txLoading}
        />
      </div>

      {/* QR Code Modal Popup */}
      <Modal isOpen={isQrModalOpen} onClose={() => setIsQrModalOpen(false)} title="My Loyalty QR Code">
        <div className="flex flex-col items-center justify-center text-center p-4 bg-white dark:bg-dark-card">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">
            {profile?.qrCode && (
              <QRCodeSVG
                value={profile.qrCode}
                size={200}
                level="M"
                includeMargin={false}
              />
            )}
          </div>
          <span className="text-sm font-mono font-semibold text-slate-500 mt-4 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-dark-border">
            {profile?.qrCode}
          </span>
          <p className="text-xs text-slate-400 mt-3 max-w-xs">
            Present this QR code to the merchant to easily earn or redeem points.
          </p>
        </div>
      </Modal>

      {/* COMPLAINT MODAL */}
      <ComplaintModal
        isOpen={isComplaintModalOpen}
        onClose={() => setIsComplaintModalOpen(false)}
        complaintTypes={['Payment Issue', 'Points Not Received', 'App Problem', 'Other']}
        apiEndpoint="/api/customer/complaint"
        defaultType="Payment Issue"
      />
    </div>
  );
}
