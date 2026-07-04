/* LOCK: 3-screen login flow component. DO NOT OVERWRITE OR CONVERT TO SINGLE-PAGE STACK IN FUTURE EDITS. */
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Award, Lock, Smartphone, Mail, Store, Shield, Eye, EyeOff, Wallet, User, ArrowLeft } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Login() {
  const { login, logout, isAuthenticated, user, loading } = useAuth();
  const navigate = useNavigate();

  // Screen Management state
  const [activeScreen, setActiveScreen] = useState('splash'); // 'splash' | 'select' | 'form'
  const [selectedRole, setSelectedRole] = useState(null);    // 'customer' | 'merchant' | 'admin'

  // Stats from backend
  const [stats, setStats] = useState({
    merchants: '500+',
    members: '50K+',
    pointsIssued: '1M+'
  });

  // Fetch stats on mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/api/auth/stats');
        const { merchantsCount, membersCount, pointsIssued } = res.data.data;
        setStats({
          merchants: merchantsCount > 0 ? `${merchantsCount}+` : '500+',
          members: membersCount > 0 ? `${membersCount}+` : '50K+',
          pointsIssued: pointsIssued > 0 ? `${(pointsIssued / 1000).toFixed(0)}K+` : '1M+'
        });
      } catch (err) {
      }
    };
    fetchStats();
  }, []);

  // NO auto-redirect useEffect here.
  // Login handlers already navigate explicitly after successful login.
  // An auto-redirect here races with initAuth() and causes stale role redirects.

  // Form states for Customer
  const [custMobile, setCustMobile] = useState('');
  const [custPassword, setCustPassword] = useState('');
  const [showCustPassword, setShowCustPassword] = useState(false);
  const [isCustLoading, setCustLoading] = useState(false);

  // Form states for Merchant
  const [merchantIdentifier, setMerchantIdentifier] = useState('');
  const [merchantPassword, setMerchantPassword] = useState('');
  const [showMerchantPassword, setShowMerchantPassword] = useState(false);
  const [isMerchantLoading, setMerchantLoading] = useState(false);

  // Merchant signup states
  const [merchantSignupMode, setMerchantSignupMode] = useState(false);
  const [signupMobile, setSignupMobile] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupBusinessName, setSignupBusinessName] = useState('');
  const [signupOwnerName, setSignupOwnerName] = useState('');
  const [signupCategory, setSignupCategory] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [isSignupLoading, setSignupLoading] = useState(false);

  // Form states for Admin
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [isAdminLoading, setAdminLoading] = useState(false);

  const handleCustomerSubmit = async (e) => {
    e.preventDefault();
    if (!custMobile || !custPassword) {
      return toast.error('Please enter mobile and password.');
    }
    if (!/^[6-9]\d{9}$/.test(custMobile)) {
      return toast.error('Enter a valid 10-digit Indian mobile number starting with 6-9.');
    }
    setCustLoading(true);
    try {
      const loggedUser = await login(custMobile, custPassword);
      if (loggedUser.role !== 'customer') {
        toast.error('This account is not registered as a Customer.');
        return;
      }
      navigate('/customer/dashboard');
    } catch (err) {
      console.error('Customer login error:', err);
      toast.error(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setCustLoading(false);
    }
  };

  const handleMerchantSubmit = async (e) => {
    e.preventDefault();
    if (!merchantIdentifier || !merchantPassword) {
      return toast.error('Please enter your email/mobile and password.');
    }
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(merchantIdentifier);
    const isMobile = /^[6-9]\d{9}$/.test(merchantIdentifier);
    if (!isEmail && !isMobile) {
      return toast.error('Enter a valid email address or 10-digit Indian mobile number.');
    }
    setMerchantLoading(true);
    try {
      const loggedUser = await login(merchantIdentifier, merchantPassword);
      if (loggedUser.role !== 'merchant') {
        toast.error('This account is not registered as a Merchant.');
        return;
      }
      navigate('/merchant/dashboard');
    } catch (err) {
      console.error('Merchant login error:', err);
      toast.error(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setMerchantLoading(false);
    }
  };

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    if (!adminEmail || !adminPassword) {
      return toast.error('Please enter email and password.');
    }
    setAdminLoading(true);
    try {
      const loggedUser = await login(adminEmail, adminPassword);
      if (loggedUser.role !== 'super_admin') {
        toast.error('This account is not registered as an Administrator.');
        return;
      }
      navigate('/admin/dashboard');
    } catch (err) {
      console.error('Admin login error:', err);
      toast.error(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setAdminLoading(false);
    }
  };

  const MERCHANT_CATEGORIES = [
    'Grocery', 'Cafe', 'Fashion', 'Electronics', 'Restaurant',
    'Pharmacy', 'Gym', 'Salon', 'Hotel', 'Other'
  ];

  const handleMerchantSignup = async (e) => {
    e.preventDefault();
    if (!signupMobile || !signupBusinessName || !signupOwnerName || !signupCategory || !signupPassword) {
      return toast.error('Please fill in all required fields.');
    }
    setSignupLoading(true);
    try {
      await api.post('/api/auth/register-merchant', {
        mobile: signupMobile,
        email: signupEmail || undefined,
        businessName: signupBusinessName,
        ownerName: signupOwnerName,
        category: signupCategory,
        password: signupPassword
      });
      toast.success('Merchant account created! Logging you in...');
      const loggedUser = await login(signupMobile, signupPassword);
      if (loggedUser.role !== 'merchant') {
        toast.error('Something went wrong. Please login manually.');
        return;
      }
      navigate('/merchant/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(msg);
    } finally {
      setSignupLoading(false);
    }
  };

  // SCREEN 1 - SPLASH SCREEN
  if (activeScreen === 'splash') {
    return (
      <div key="splash" className="min-h-screen bg-[#0a0f1e] text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Style tag for animations */}
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.98) translateY(8px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
          .animate-screen {
            animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        `}</style>

        {/* Decorative Blur Spheres */}
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#38bdf8]/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md flex flex-col items-center text-center space-y-8 relative z-10 animate-screen">
          {/* Large SkillXT shield/badge logo icon */}
          <div className="p-6 bg-gradient-to-br from-[#38bdf8] to-blue-600 text-white rounded-3xl shadow-xl shadow-cyan-500/20 border border-white/10 flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
            <Award className="w-20 h-20 text-white" />
          </div>

          <div className="space-y-4">
            {/* Heading: "SkillXT" large bold cyan/blue color */}
            <h1 className="text-5xl font-black tracking-tight text-[#38bdf8] drop-shadow-md">
              SkillXT
            </h1>
            {/* Subheading: "Welcome to your rewards ecosystem" */}
            <p className="text-xl font-bold text-slate-200">
              Welcome to your rewards ecosystem
            </p>
            {/* Body text */}
            <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-sm">
              Empowering Merchants. Rewarding Customers. Seamless loyalty across every outlet.
            </p>
          </div>

          {/* Centered button: "Enter Site" cyan/blue color */}
          <button
            onClick={() => setActiveScreen('select')}
            className="px-8 py-3.5 bg-[#38bdf8] hover:bg-[#0ea5e9] text-slate-900 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-cyan-500/20 flex items-center gap-2"
          >
            Enter Site
          </button>
        </div>
      </div>
    );
  }

  // SCREEN 2 - ROLE SELECTION
  if (activeScreen === 'select') {
    return (
      <div key="select" className="min-h-screen bg-[#0a0f1e] text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.98) translateY(8px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
          .animate-screen {
            animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .cyan-glow:hover {
            box-shadow: 0 0 25px rgba(56, 189, 248, 0.15);
            border-color: rgba(56, 189, 248, 0.4);
          }
        `}</style>

        {/* Decorative Blur Spheres */}
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#38bdf8]/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md flex flex-col items-center space-y-8 relative z-10 animate-screen">
          {/* Small SkillXT logo at top */}
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-[#38bdf8] to-blue-600 text-white rounded-xl shadow-md flex items-center justify-center">
              <Award className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              SkillXT
            </span>
          </div>

          <h2 className="text-2xl font-black text-white text-center">
            Choose your role to continue
          </h2>

          {/* Three cards stacked vertically */}
          <div className="w-full space-y-4">
            
            {/* Card 1: Customer */}
            <div
              onClick={() => {
                setSelectedRole('customer');
                setActiveScreen('form');
              }}
              className="bg-[#1a2035] border border-slate-800 rounded-2xl p-5 shadow-xl cursor-pointer hover:shadow-cyan-500/10 hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] flex items-start gap-4 cyan-glow"
            >
              <div className="p-3 bg-cyan-500/10 text-[#38bdf8] rounded-xl border border-cyan-500/20 shrink-0">
                <Wallet className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#38bdf8]">Customer</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Access your loyalty points wallet and redeem rewards across outlets.
                </p>
              </div>
            </div>

            {/* Card 2: Merchant */}
            <div
              onClick={() => {
                setSelectedRole('merchant');
                setMerchantSignupMode(false);
                setActiveScreen('form');
              }}
              className="bg-[#1a2035] border border-slate-800 rounded-2xl p-5 shadow-xl cursor-pointer hover:shadow-cyan-500/10 hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] flex items-start gap-4 cyan-glow"
            >
              <div className="p-3 bg-cyan-500/10 text-[#38bdf8] rounded-xl border border-cyan-500/20 shrink-0">
                <Store className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#38bdf8]">Merchant</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Manage your outlet, issue points and track redemptions.
                </p>
              </div>
            </div>

            {/* Card 3: Administrator */}
            <div
              onClick={() => {
                setSelectedRole('admin');
                setActiveScreen('form');
              }}
              className="bg-[#1a2035] border border-slate-800 rounded-2xl p-5 shadow-xl cursor-pointer hover:shadow-cyan-500/10 hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] flex items-start gap-4 cyan-glow"
            >
              <div className="p-3 bg-cyan-500/10 text-[#38bdf8] rounded-xl border border-cyan-500/20 shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#38bdf8]">Administrator</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Headquarters console, manage merchants, customers and settings.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // SCREEN 3 - LOGIN FORM
  return (
    <div key="form" className="min-h-screen bg-[#0a0f1e] text-slate-100 flex flex-col items-center justify-center py-12 px-4 relative overflow-y-auto">
      {/* Style tag for hover glows and animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-screen {
          animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .blue-glow:hover {
          box-shadow: 0 0 25px rgba(59, 130, 246, 0.15);
          border-color: rgba(59, 130, 246, 0.4);
        }
        .green-glow:hover {
          box-shadow: 0 0 25px rgba(22, 163, 74, 0.15);
          border-color: rgba(22, 163, 74, 0.4);
        }
        .purple-glow:hover {
          box-shadow: 0 0 25px rgba(124, 58, 237, 0.15);
          border-color: rgba(124, 58, 237, 0.4);
        }
      `}</style>

      {/* Decorative Blur Spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#38bdf8]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute top-[35%] right-[-20%] w-[500px] h-[500px] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none" />

      {/* Back arrow top left */}
      <button
        onClick={() => {
          setSelectedRole(null);
          setMerchantSignupMode(false);
          setActiveScreen('select');
        }}
        className="absolute top-6 left-6 p-2.5 text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 rounded-xl transition-all flex items-center justify-center z-20"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <div className="w-full max-w-md flex flex-col items-center space-y-8 relative z-10 animate-screen">
        
        {/* Header: Small logo + "SkillXT Loyalty Program" */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-[#38bdf8] to-blue-600 text-white rounded-xl shadow-md flex items-center justify-center">
              <Award className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              SkillXT
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-md">
            SkillXT Loyalty Program
          </h1>
        </div>

        {/* ONE login card matching selected role */}
        <div className="w-full">
          
          {selectedRole === 'customer' && (
            <div className="bg-[#1a2035] border border-slate-800 rounded-3xl p-6 shadow-xl blue-glow transition-all duration-300">
              <form onSubmit={handleCustomerSubmit} className="space-y-4" autoComplete="off">
                
                {/* Header */}
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20 shrink-0">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">Customer Login</h3>
                    <p className="text-xs text-slate-400">Access points, wallet and redeem rewards</p>
                  </div>
                </div>

                {/* Mobile Field */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                      <Smartphone className="w-4 h-4 text-slate-400" />
                    </span>
                    <input
                      type="tel"
                      name="customer-mobile"
                      autoComplete="username"
                      id="customer-mobile"
                      required
                      maxLength={10}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#0a0f1e] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-[#2563eb] transition-all font-semibold"
                      placeholder="Enter 10-digit mobile"
                      value={custMobile}
                      onChange={(e) => setCustMobile(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Password
                    </label>
                    <Link to="/forgot-password" className="text-xs text-slate-400 hover:text-blue-400 transition-colors">
                      Forgot Password?
                    </Link>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                      <Lock className="w-4 h-4 text-slate-400" />
                    </span>
                    <input
                      type={showCustPassword ? 'text' : 'password'}
                      name="customer-password"
                      autoComplete="new-password"
                      id="customer-password"
                      required
                      className="w-full pl-10 pr-10 py-2.5 bg-[#0a0f1e] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-[#2563eb] transition-all font-semibold"
                      placeholder="••••••••"
                      value={custPassword}
                      onChange={(e) => setCustPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCustPassword(!showCustPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                    >
                      {showCustPassword ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                    </button>
                  </div>
                </div>

                {/* Footer Strip */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-800/60 mt-4">
                  <Link to="/register" className="text-xs font-extrabold text-blue-400 hover:text-blue-300 hover:underline">
                    New customer? Sign up now
                  </Link>
                  <button
                    type="submit"
                    disabled={isCustLoading}
                    className="px-5 py-2.5 bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-blue-500/10 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isCustLoading && <span className="w-3 h-3 border-2 border-white border-t-transparent animate-spin rounded-full" />}
                    Sign In As Customer
                  </button>
                </div>

              </form>
            </div>
          )}

          {/* Merchant Self-Signup Link */}
          {selectedRole === 'customer' && (
            <p className="text-xs text-slate-400 text-center">
              Want to become a merchant partner?{' '}
              <Link to="/merchant-signup" className="font-bold text-emerald-400 hover:text-emerald-300 hover:underline">
                Apply here
              </Link>
            </p>
          )}

          {selectedRole === 'merchant' && !merchantSignupMode && (
            <div className="bg-[#1a2035] border border-slate-800 rounded-3xl p-6 shadow-xl green-glow transition-all duration-300">
              <form onSubmit={handleMerchantSubmit} className="space-y-4" autoComplete="off">
                
                {/* Header */}
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 shrink-0">
                    <Store className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">Merchant Login</h3>
                    <p className="text-xs text-slate-400">Manage store points and issue redemptions</p>
                  </div>
                </div>

{/* Email / Mobile Field */}
                 <div>
                   <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                     Email or Mobile
                   </label>
                   <div className="relative">
                     <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                       <Mail className="w-4 h-4 text-slate-400" />
                     </span>
                     <input
                      type="text"
                      name="merchant-identifier"
                      autoComplete="username"
                      id="merchant-identifier"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-[#0a0f1e] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-[#16a34a] transition-all font-semibold"
                      placeholder="merchant@domain.com or 9000000001"
                      value={merchantIdentifier}
                      onChange={(e) => setMerchantIdentifier(e.target.value)}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Password
                    </label>
                    <Link to="/forgot-password" className="text-xs text-slate-400 hover:text-emerald-400 transition-colors">
                      Forgot Password?
                    </Link>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                      <Lock className="w-4 h-4 text-slate-400" />
                    </span>
                    <input
                      type={showMerchantPassword ? 'text' : 'password'}
                      name="merchant-password"
                      autoComplete="new-password"
                      id="merchant-password"
                      required
                      className="w-full pl-10 pr-10 py-2.5 bg-[#0a0f1e] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-[#16a34a] transition-all font-semibold"
                      placeholder="••••••••"
                      value={merchantPassword}
                      onChange={(e) => setMerchantPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowMerchantPassword(!showMerchantPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                    >
                      {showMerchantPassword ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                    </button>
                  </div>
                </div>

                {/* Footer Strip */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-800/60 mt-4">
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); setMerchantSignupMode(true); }}
                    className="text-xs font-extrabold text-[#16a34a] hover:text-emerald-500 hover:underline"
                  >
                    Create merchant account
                  </a>
                  <button
                    type="submit"
                    disabled={isMerchantLoading}
                    className="px-5 py-2.5 bg-[#16a34a] hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-emerald-500/10 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isMerchantLoading && <span className="w-3 h-3 border-2 border-white border-t-transparent animate-spin rounded-full" />}
                    Sign In As Merchant
                  </button>
                </div>

              </form>
            </div>
          )}

          {selectedRole === 'merchant' && merchantSignupMode && (
            <div className="bg-[#1a2035] border border-slate-800 rounded-3xl p-6 shadow-xl green-glow transition-all duration-300">
              <form onSubmit={handleMerchantSignup} className="space-y-3">
                
                {/* Header */}
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 shrink-0">
                    <Store className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">Merchant Sign Up</h3>
                    <p className="text-xs text-slate-400">Create your merchant account and start earning</p>
                  </div>
                </div>

                {/* Mobile */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Mobile Number *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                      <Smartphone className="w-4 h-4 text-slate-400" />
                    </span>
                    <input
                      type="text"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-[#0a0f1e] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-[#16a34a] transition-all font-semibold"
                      placeholder="9000000001"
                      value={signupMobile}
                      onChange={(e) => setSignupMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Email (optional)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                      <Mail className="w-4 h-4 text-slate-400" />
                    </span>
                    <input
                      type="email"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#0a0f1e] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-[#16a34a] transition-all font-semibold"
                      placeholder="merchant@domain.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                    />
                  </div>
                </div>

                {/* Business Name */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Business Name *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                      <Store className="w-4 h-4 text-slate-400" />
                    </span>
                    <input
                      type="text"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-[#0a0f1e] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-[#16a34a] transition-all font-semibold"
                      placeholder="e.g. Fresh Mart"
                      value={signupBusinessName}
                      onChange={(e) => setSignupBusinessName(e.target.value)}
                    />
                  </div>
                </div>

                {/* Owner Name */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Owner Name *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                      <User className="w-4 h-4 text-slate-400" />
                    </span>
                    <input
                      type="text"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-[#0a0f1e] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-[#16a34a] transition-all font-semibold"
                      placeholder="e.g. Rahul Sharma"
                      value={signupOwnerName}
                      onChange={(e) => setSignupOwnerName(e.target.value)}
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Business Category *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                      <Wallet className="w-4 h-4 text-slate-400" />
                    </span>
                    <select
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-[#0a0f1e] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-[#16a34a] transition-all font-semibold appearance-none"
                      value={signupCategory}
                      onChange={(e) => setSignupCategory(e.target.value)}
                    >
                      <option value="">Select category</option>
                      {MERCHANT_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat.toLowerCase()}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Password *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                      <Lock className="w-4 h-4 text-slate-400" />
                    </span>
                    <input
                      type={showSignupPassword ? 'text' : 'password'}
                      required
                      className="w-full pl-10 pr-10 py-2.5 bg-[#0a0f1e] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-[#16a34a] transition-all font-semibold"
                      placeholder="Min 8 chars, upper, lower, number, symbol"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                    >
                      {showSignupPassword ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                    </button>
                  </div>
                </div>

                {/* Footer Strip */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-800/60 mt-3">
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); setMerchantSignupMode(false); }}
                    className="text-xs font-extrabold text-slate-400 hover:text-slate-300 hover:underline flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3 h-3" /> Back to login
                  </a>
                  <button
                    type="submit"
                    disabled={isSignupLoading}
                    className="px-5 py-2.5 bg-[#16a34a] hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-emerald-500/10 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSignupLoading && <span className="w-3 h-3 border-2 border-white border-t-transparent animate-spin rounded-full" />}
                    Create Account
                  </button>
                </div>

              </form>
            </div>
          )}

          {selectedRole === 'admin' && (
            <div className="bg-[#1a2035] border border-slate-800 rounded-3xl p-6 shadow-xl purple-glow transition-all duration-300">
              <form onSubmit={handleAdminSubmit} className="space-y-4" autoComplete="off">
                
                {/* Header */}
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-purple-500/10 text-purple-400 rounded-full border border-purple-500/20 shrink-0">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">Admin Login</h3>
                    <p className="text-xs text-slate-400">Restricted console for platform settings</p>
                  </div>
                </div>

{/* Admin Email Field */}
                 <div>
                   <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                     Administrator Email or Mobile
                   </label>
                   <div className="relative">
                     <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                       <User className="w-4 h-4 text-slate-400" />
                     </span>
                     <input
                      type="email"
                      name="admin-email"
                      autoComplete="username"
                      id="admin-email"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-[#0a0f1e] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-[#7c3aed] transition-all font-semibold"
                      placeholder="admin@skillxt.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                     />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                      <Lock className="w-4 h-4 text-slate-400" />
                    </span>
                    <input
                      type={showAdminPassword ? 'text' : 'password'}
                      name="admin-password"
                      autoComplete="new-password"
                      id="admin-password"
                      required
                      className="w-full pl-10 pr-10 py-2.5 bg-[#0a0f1e] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-[#7c3aed] transition-all font-semibold"
                      placeholder="••••••••"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                    >
                      {showAdminPassword ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                    </button>
                  </div>
                </div>

                {/* Footer Strip */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-800/60 mt-4">
                  <span className="text-xs font-semibold text-rose-500 uppercase tracking-wider">
                    Restricted access
                  </span>
                  <button
                    type="submit"
                    disabled={isAdminLoading}
                    className="px-5 py-2.5 bg-[#7c3aed] hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-purple-500/10 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isAdminLoading && <span className="w-3 h-3 border-2 border-white border-t-transparent animate-spin rounded-full" />}
                    Sign In As Administrator
                  </button>
                </div>

              </form>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
/* LOCK: 3-screen login flow component. END LOCK. */
