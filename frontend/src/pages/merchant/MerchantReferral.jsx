import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/api';
import {
  Gift,
  Copy,
  Check,
  Share2,
  Users,
  TrendingUp,
  Award,
  ShoppingBag,
  Scissors,
  Coffee,
  Dumbbell,
  Shirt,
  Pill,
  BookOpen,
  Wrench,
  Hotel,
  GraduationCap,
  Bell,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  ChevronDown
} from 'lucide-react';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

const CATEGORY_ICONS = {
  grocery: { icon: ShoppingBag, label: 'Grocery', color: 'text-emerald-500' },
  cafe: { icon: Coffee, label: 'Cafe', color: 'text-amber-500' },
  beauty: { icon: Scissors, label: 'Salon', color: 'text-pink-500' },
  gym: { icon: Dumbbell, label: 'Gym', color: 'text-blue-500' },
  fashion: { icon: Shirt, label: 'Boutique', color: 'text-purple-500' },
  pharmacy: { icon: Pill, label: 'Pharmacy', color: 'text-teal-500' },
  medical: { icon: Pill, label: 'Pharmacy', color: 'text-teal-500' },
  doctor: { icon: Pill, label: 'Clinic', color: 'text-sky-500' },
  stationery: { icon: BookOpen, label: 'Stationery', color: 'text-orange-500' },
  electronics: { icon: Wrench, label: 'Electronics', color: 'text-slate-500' },
  hotel: { icon: Hotel, label: 'Hotel', color: 'text-indigo-500' },
  education: { icon: GraduationCap, label: 'Education', color: 'text-cyan-500' },
};

const CATEGORY_WHATSAPP = {
  grocery: 'grocery store',
  cafe: 'cafe or restaurant',
  beauty: 'salon or beauty parlor',
  gym: 'gym or fitness centre',
  fashion: 'fashion boutique or clothing store',
  pharmacy: 'pharmacy',
  medical: 'pharmacy',
  doctor: 'doctor or clinic',
  stationery: 'stationery shop',
  electronics: 'electronics store',
  hotel: 'hotel or travel agency',
  education: 'coaching or education centre',
};

function fallbackCopy(text) {
  return new Promise((resolve, reject) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try { document.execCommand('copy'); resolve(); }
    catch { reject(new Error('Copy failed')); }
    finally { document.body.removeChild(textarea); }
  });
}

async function secureCopy(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
  } else {
    await fallbackCopy(text);
  }
}

export default function MerchantReferral() {
  const [loading, setLoading] = useState(true);
  const [myCode, setMyCode] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [nearby, setNearby] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [copied, setCopied] = useState(false);
  const [capStatus, setCapStatus] = useState(null);
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [expandedReferral, setExpandedReferral] = useState(null);

  const fetchAll = async () => {
    try {
      const [codeRes, referralsRes, nearbyRes, leaderboardRes] = await Promise.allSettled([
        api.get('/api/merchant/referral/my-code'),
        api.get('/api/merchant/referral/my-referrals'),
        api.get('/api/merchant/referral/nearby-businesses'),
        api.get('/api/merchant/referral/leaderboard'),
      ]);

      if (codeRes.status === 'fulfilled') {
        setMyCode(codeRes.value.data.data);
        setCapStatus(codeRes.value.data.data.monthlyCap);
      }
      if (referralsRes.status === 'fulfilled') {
        setReferrals(referralsRes.value.data.data || []);
      }
      if (nearbyRes.status === 'fulfilled') {
        setNearby(nearbyRes.value.data.data || []);
      }
      if (leaderboardRes.status === 'fulfilled') {
        setLeaderboard(leaderboardRes.value.data.data || []);
      }
    } catch (err) {
      toast.error('Failed to load referral data.');
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        await fetchAll();
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleCopyCode = async () => {
    if (!myCode?.referralCode) return;
    try {
      await secureCopy(myCode.referralCode);
      setCopied(true);
      toast.success('Referral code copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy code.');
    }
  };

  const handleCopyLink = async () => {
    if (!myCode?.referralCode) return;
    const base = import.meta.env.VITE_APP_URL || window.location.origin;
    const url = `${base}/merchant-signup?mcode=${encodeURIComponent(myCode.referralCode)}`;
    try {
      await secureCopy(url);
      toast.success('Signup link copied!');
    } catch {
      toast.error('Failed to copy link.');
    }
  };

  const handleShareWhatsApp = (referralCode) => {
    if (!referralCode) return;
    const base = import.meta.env.VITE_APP_URL || window.location.origin;
    const url = `${base}/merchant-signup?mcode=${encodeURIComponent(referralCode)}`;
    const text = encodeURIComponent(
      `Hey! I'm on SkillXT Rewards. Use my referral code to join and we both benefit.\n\nReferral Code: ${referralCode}\nJoin here: ${url}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => checkScroll());
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [nearby, checkScroll]);

  const scrollByAmount = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.firstChild?.offsetWidth || 120;
    el.scrollBy({ left: direction * (cardWidth + 12), behavior: 'smooth' });
  };

  const handleCategoryShare = (category) => {
    if (!myCode?.referralCode) return;
    handleShareWhatsApp(myCode.referralCode);
  };

  const getReferralSteps = (ref) => {
    const holdActive = new Date(ref.holdUntilDate) > new Date() && !ref.instantRewardPaid;
    const holdDone = ref.instantRewardPaid;
    return [
      { label: 'Activated', done: true },
      { label: 'Hold', done: holdDone, active: holdActive },
      { label: 'Reward', done: ref.instantRewardPaid },
      { label: 'Renewal 1', done: ref.monthsTrickled >= 1 },
      { label: 'Renewal 2', done: ref.monthsTrickled >= 2 },
      { label: 'Renewal 3', done: ref.monthsTrickled >= 3 },
    ];
  };

  if (loading) return <LoadingSpinner />;

  const activeCount = referrals.filter(r => r.referredMerchant?.status === 'active' && r.referredMerchant?.isActive).length;
  const totalReferrals = referrals.length;
  const instantRewards = referrals.filter(r => r.instantRewardPaid).length;
  const monthlyCap = capStatus?.cap || 5;
  const monthlyUsed = capStatus?.rewardedCount || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
          Refer & Earn
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Invite other merchants to SkillXT and earn rewards
        </p>
      </div>

      {/* Share Box */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/20">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-100">Your Referral Code</p>
            <p className="text-3xl font-black tracking-wider mt-1">{myCode?.referralCode || '---'}</p>
          </div>
          <div className="p-3 bg-white/10 rounded-xl">
            <Gift className="w-6 h-6" />
          </div>
        </div>
        <p className="text-xs text-emerald-100 mb-4">
          Share this code with other merchants. When they sign up and activate, you earn 2,000 points!
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleCopyCode}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold transition-all btn-press"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
          <button
            onClick={handleCopyLink}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold transition-all btn-press"
          >
            <Share2 className="w-4 h-4" />
            Copy Link
          </button>
          <button
            onClick={() => handleShareWhatsApp(myCode?.referralCode)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white text-emerald-700 hover:bg-emerald-50 rounded-xl text-xs font-bold transition-all btn-press"
          >
            <MessageSquare className="w-4 h-4" />
            WhatsApp
          </button>
        </div>
      </div>

      {/* Reward Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Active Referrals"
          value={activeCount}
          color="success"
        />
        <StatCard
          icon={TrendingUp}
          label="Monthly Cap"
          value={`${monthlyUsed} / ${monthlyCap}`}
          color={monthlyUsed >= monthlyCap ? 'warning' : 'info'}
        />
        <StatCard
          icon={Gift}
          label="Instant Rewards"
          value={instantRewards}
          color="primary"
        />
        <StatCard
          icon={Award}
          label="Total Referrals"
          value={totalReferrals}
          color="info"
        />
      </div>

      {/* Pending Rewards Info */}
      {referrals.some(r => r.status === 'active' && !r.instantRewardPaid) && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Rewards on Hold</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                Some referral rewards are within the 15-day hold period and will be released automatically.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Business Categories to Invite */}
      {nearby.length > 0 && (
        <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-2xl shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-dark-border">
            <h2 className="text-lg font-black text-slate-800 dark:text-white">
              Businesses to Invite
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Share your referral code with businesses different from yours
            </p>
          </div>
          <div className="relative px-10 py-5">
            {canScrollLeft && (
              <button
                onClick={() => scrollByAmount(-1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-1.5 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-full shadow-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors btn-press"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </button>
            )}
            {canScrollRight && (
              <button
                onClick={() => scrollByAmount(1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1.5 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-full shadow-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors btn-press"
              >
                <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </button>
            )}
            <div
              ref={scrollRef}
              className="flex gap-3 overflow-x-auto scroll-smooth pb-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
            >
              {nearby.map((cat) => {
                const catInfo = CATEGORY_ICONS[cat.category] || { icon: ShoppingBag, label: cat.label || 'Other', color: 'text-slate-500' };
                const Icon = catInfo.icon;
                return (
                  <button
                    key={cat.category}
                    onClick={() => handleCategoryShare(cat.category)}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-100 dark:border-dark-border hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all group btn-press shrink-0 w-[100px]"
                  >
                    <div className={`p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 transition-colors ${catInfo.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-white text-center leading-tight">
                      {catInfo.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* My Referrals List */}
      {referrals.length > 0 && (
        <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-dark-border">
            <h2 className="text-lg font-black text-slate-800 dark:text-white">
              My Referrals
            </h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-dark-border">
            {referrals.map((ref) => {
              const steps = getReferralSteps(ref);
              const isExpanded = expandedReferral === ref.id;
              const earned = (ref.instantRewardPaid ? 2000 : 0) + ref.monthsTrickled * 500;
              const holdDaysLeft = Math.max(0, Math.ceil((new Date(ref.holdUntilDate) - new Date()) / 86400000));
              const holdActive = steps[1].active;

              return (
                <div key={ref.id}>
                  <button
                    onClick={() => setExpandedReferral(isExpanded ? null : ref.id)}
                    className="w-full text-left px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-4 min-w-[480px]"
                  >
                    <div className="shrink-0 w-28 sm:w-36 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                        {ref.referredMerchant?.businessName || 'Unknown'}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{ref.referredMerchant?.city}</p>
                    </div>

                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      {steps.map((step, i) => (
                        <React.Fragment key={i}>
                          <div className="flex flex-col items-center shrink-0" title={step.label}>
                            {step.done ? (
                              <div className="w-4 h-4 rounded-full bg-emerald-500 dark:bg-emerald-400 flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                              </div>
                            ) : step.active ? (
                              <div className="w-4 h-4 rounded-full bg-amber-400 dark:bg-amber-500 flex items-center justify-center">
                                <Clock className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                              </div>
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-dark-card" />
                            )}
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 whitespace-nowrap hidden sm:block">{step.label}</span>
                          </div>
                          {i < steps.length - 1 && (
                            <div className={`flex-1 h-0.5 min-w-[6px] rounded-full shrink ${
                              step.done ? 'bg-emerald-400 dark:bg-emerald-500' : 'bg-slate-100 dark:bg-slate-700'
                            }`} />
                          )}
                        </React.Fragment>
                      ))}
                    </div>

                    <ChevronDown className={`w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {isExpanded && (
                    <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-dark-border">
                      <div className="flex flex-col sm:flex-row gap-6">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-white mb-1">
                            {ref.referredMerchant?.businessName || 'Unknown'}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">{ref.referredMerchant?.city}</p>

                          <div className="space-y-2.5">
                            {steps.map((step, i) => (
                              <div key={i} className="flex items-center gap-2.5">
                                {step.done ? (
                                  <div className="w-5 h-5 rounded-full bg-emerald-500 dark:bg-emerald-400 flex items-center justify-center shrink-0">
                                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                  </div>
                                ) : step.active ? (
                                  <div className="w-5 h-5 rounded-full bg-amber-400 dark:bg-amber-500 flex items-center justify-center shrink-0">
                                    <Clock className="w-3 h-3 text-white" strokeWidth={3} />
                                  </div>
                                ) : (
                                  <div className="w-5 h-5 rounded-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-dark-card shrink-0" />
                                )}
                                <span className={`text-xs font-medium ${
                                  step.done ? 'text-slate-700 dark:text-slate-200' :
                                  step.active ? 'text-amber-700 dark:text-amber-300' :
                                  'text-slate-400 dark:text-slate-500'
                                }`}>
                                  {step.label}
                                  {i === 2 && step.done && <span className="ml-1 text-emerald-600 dark:text-emerald-400">+2,000</span>}
                                  {i >= 3 && i <= 5 && step.done && <span className="ml-1 text-emerald-600 dark:text-emerald-400">+500</span>}
                                </span>
                                {step.active && holdDaysLeft > 0 && (
                                  <span className="text-[10px] text-amber-600 dark:text-amber-400 ml-auto shrink-0">
                                    Ends in {holdDaysLeft}d
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="sm:w-44 shrink-0 flex sm:flex-col gap-3 sm:gap-2">
                          <div className="flex-1 sm:flex-none bg-white dark:bg-dark-card rounded-xl p-3 border border-slate-100 dark:border-dark-border">
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Earned</p>
                            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{earned.toLocaleString()}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">of 3,500 max</p>
                          </div>
                          <div className="flex-1 sm:flex-none bg-white dark:bg-dark-card rounded-xl p-3 border border-slate-100 dark:border-dark-border">
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status</p>
                            <p className="text-xs font-bold mt-1 capitalize text-slate-700 dark:text-slate-200">
                              {ref.monthsTrickled >= 3 ? 'Completed' : 'Active'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-dark-border">
            <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Referral Leaderboard
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Ranked by active referred merchants
            </p>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-dark-border">
            {leaderboard.map((entry, idx) => (
              <div
                key={entry.id}
                className={`flex items-center gap-4 px-6 py-3 transition-colors ${
                  idx === 0 ? 'bg-amber-50/50 dark:bg-amber-950/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                  idx === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                  idx === 1 ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' :
                  idx === 2 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300' :
                  'bg-slate-50 text-slate-400 dark:bg-slate-800/50 dark:text-slate-500'
                }`}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                    {entry.businessName}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {entry.city || entry.category}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {entry.activeReferralCount}
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase">referrals</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && referrals.length === 0 && nearby.length === 0 && (
        <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-2xl p-12 text-center">
          <div className="inline-flex p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-full mb-4">
            <Gift className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Start Referring</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">
            Share your referral code with other merchants. When they sign up and activate their subscription, you earn rewards!
          </p>
        </div>
      )}
    </div>
  );
}
