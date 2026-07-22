import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Award, Smartphone, ShieldCheck, User, Lock, ArrowRight, Check, Eye, EyeOff, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { copyReferralCode, copyReferralUrl } from '../services/referral';

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState(1); // 1: Mobile entry, 2: OTP verify, 3: Account info
  
  // Form values
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [merchantCode, setMerchantCode] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hasReferralFromUrl, setHasReferralFromUrl] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setReferralCode(ref.toUpperCase());
      setHasReferralFromUrl(true);
    }
    const mcode = params.get('mcode');
    if (mcode) {
      setMerchantCode(mcode.toUpperCase());
    }
  }, []);

  const [otpArray, setOtpArray] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([]);
  const lastAttemptedOtp = useRef('');

  useEffect(() => {
    if (lockoutTimer <= 0) return;
    const interval = setInterval(() => {
      setLockoutTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (!otp) {
      return toast.error('Please enter the OTP.');
    }
    if (otp.length !== 6) {
      return toast.error('OTP must be exactly 6 digits.');
    }
    if (lockoutTimer > 0) {
      return toast.error(`Verification locked. Please wait ${lockoutTimer} seconds.`);
    }

    setIsLoading(true);
    try {
      const response = await api.post('/api/auth/verify-otp', { mobile, otp });
      toast.success(response.data.message || 'OTP verified successfully!');
      setStep(3);
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid or expired OTP.';
      toast.error(msg);
      setOtp('');
      setOtpArray(['', '', '', '', '', '']);
      if (err.response?.data?.code === 'OTP_LOCKED') {
        setLockoutTimer(err.response.data.retryAfter || 30);
        setAttemptsRemaining(0);
      } else if (err.response?.data?.attemptsRemaining !== undefined) {
        setAttemptsRemaining(err.response.data.attemptsRemaining);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtpRef = useRef(handleVerifyOtp);
  handleVerifyOtpRef.current = handleVerifyOtp;

  useEffect(() => {
    if (otp.length === 6 && step === 2 && lockoutTimer <= 0 && !isLoading && otp !== lastAttemptedOtp.current) {
      lastAttemptedOtp.current = otp;
      handleVerifyOtpRef.current();
    }
  }, [otp, step, lockoutTimer, isLoading]);

  const handleOtpChange = (index, value) => {
    const cleanVal = value.replace(/\D/g, '').slice(-1);
    const newArr = [...otpArray];
    newArr[index] = cleanVal;
    setOtpArray(newArr);
    setOtp(newArr.join(''));

    if (cleanVal && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otpArray[index] && index > 0) {
        const newArr = [...otpArray];
        newArr[index - 1] = '';
        setOtpArray(newArr);
        setOtp(newArr.join(''));
        otpRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length > 0) {
      const newArr = ['', '', '', '', '', ''];
      for (let i = 0; i < pastedData.length; i++) {
        newArr[i] = pastedData[i];
      }
      setOtpArray(newArr);
      setOtp(newArr.join(''));
      const focusIdx = Math.min(pastedData.length, 5);
      otpRefs.current[focusIdx]?.focus();
    }
  };

  // Step 1: Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(mobile)) {
      return toast.error('Mobile number must be exactly 10 digits.');
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return toast.error('Enter a valid email address.');
    }

    setIsLoading(true);
    try {
      const response = await api.post('/api/auth/request-otp', { mobile, email: email || null });
      toast.success(response.data.message || 'OTP sent successfully.');
      setStep(2);
      setAttemptsRemaining(null);
      setOtpArray(['', '', '', '', '', '']);
      setOtp('');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to request OTP.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Register account
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name || !password || !confirmPassword) {
      return toast.error('Please fill in all fields.');
    }
    if (password.length < 8) {
      return toast.error('Password must be at least 8 characters long.');
    }
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecialChar) {
      return toast.error('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.');
    }
    if (password !== confirmPassword) {
      return toast.error('Passwords do not match.');
    }

    setIsLoading(true);
    try {
      const response = await api.post('/api/auth/register', {
        name,
        mobile,
        email,
        password,
        otp,
        referralCode: referralCode || null,
        merchantCode: merchantCode || null
      });
      toast.success(response.data.message || 'Account created successfully! Welcome to SkillXT.');
      if (response.data.data?.referralWarning) {
        toast(response.data.data.referralWarning, {
          icon: '\u26A0\uFE0F',
          duration: 6000,
          style: { background: '#FFF7ED', color: '#9A3412', border: '1px solid #FDBA74' }
        });
      }
      try {
        const loggedUser = await login(mobile, password);
        if (loggedUser?.role === 'customer') {
          navigate('/customer/dashboard');
        } else {
          navigate('/login');
        }
      } catch {
        navigate('/login');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyReferralCode = async () => {
    try {
      await copyReferralCode(referralCode);
      toast.success('Referral code copied!');
    } catch {
      toast.error('Could not copy. Please copy manually: ' + referralCode);
    }
  };

  const handleCopyReferralUrl = async () => {
    try {
      await copyReferralUrl(referralCode);
      toast.success('Referral link copied!');
    } catch {
      toast.error('Could not copy link.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-darkBg transition-colors duration-200">
      <div className="w-full max-w-md bg-white dark:bg-dark-card rounded-3xl shadow-xl border border-slate-100 dark:border-dark-border p-8">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-primary text-white rounded-2xl mb-4">
            <Award className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black text-slate-800 dark:text-white">Join SkillXT Rewards</h1>
          <p className="text-sm text-slate-400 dark:text-slate-400 mt-1">
            Register and start earning shared points
          </p>
        </div>

        {/* Steps Tracker */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
            {step > 1 ? <Check className="w-4 h-4" /> : '1'}
          </div>
          <div className={`w-10 h-0.5 ${step >= 2 ? 'bg-primary' : 'bg-slate-100 dark:bg-slate-800'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
            {step > 2 ? <Check className="w-4 h-4" /> : '2'}
          </div>
          <div className={`w-10 h-0.5 ${step >= 3 ? 'bg-primary' : 'bg-slate-100 dark:bg-slate-800'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= 3 ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
            3
          </div>
        </div>

        {/* Wizard Forms */}

        {/* STEP 1: MOBILE ENTRY */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-2">
                Mobile Number (Indian Format)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Smartphone className="w-4 h-4" />
                </span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="Enter 10-digit mobile"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-2">
                Email Address (Optional)
              </label>
              <input
                type="email"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="customer@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20 hover:shadow-lg transition-all focus:outline-none flex items-center justify-center gap-2 disabled:opacity-50 btn-press"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
              ) : null}
              Request OTP
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STEP 2: OTP VERIFICATION */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-3 text-center">
                Enter 6-Digit Verification Code
              </label>
              <div className="flex justify-between gap-2 max-w-xs mx-auto mb-4">
                {otpArray.map((digit, index) => (
                  <input
                    key={index}
                    type="text"
                    required
                    maxLength={1}
                    pattern="[0-9]*"
                    inputMode="numeric"
                    ref={(el) => (otpRefs.current[index] = el)}
                    disabled={lockoutTimer > 0}
                    className="w-11 h-11 text-center text-lg font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-60 font-mono"
                    placeholder="-"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={handleOtpPaste}
                  />
                ))}
              </div>
              {attemptsRemaining !== null && attemptsRemaining < 5 && (
                <p className="text-xs text-rose-500 font-semibold text-center mt-2">
                  {attemptsRemaining === 0 ? 'Verification locked.' : `${attemptsRemaining} ${attemptsRemaining === 1 ? 'attempt' : 'attempts'} remaining`}
                </p>
              )}

            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isLoading || lockoutTimer > 0}
                className="flex-1 py-3 border border-slate-200 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 btn-press"
              >
                Go Back
              </button>
              <button
                type="submit"
                disabled={isLoading || lockoutTimer > 0}
                className="flex-1 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 btn-press"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                ) : null}
                {lockoutTimer > 0 ? `Try again in ${lockoutTimer}s...` : 'Verify OTP'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: REGISTRATION DETAILS */}
        {step === 3 && (
          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-2">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="Enter full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-2">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold"
                  placeholder="Min 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 btn-press"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 btn-press"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs font-bold text-rose-500 mt-1.5">Passwords do not match</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-2">
                Referral Code (optional)
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="Enter friend's referral code"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
              />
              {hasReferralFromUrl && referralCode && (
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={handleCopyReferralCode}
                    className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5 btn-press"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy Code
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyReferralUrl}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5 btn-press"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy Link
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-2">
                Merchant Onboarding Code (optional)
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="Enter merchant onboarding code"
                value={merchantCode}
                onChange={(e) => setMerchantCode(e.target.value)}
              />
            </div>

            <label className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
              <input
                type="checkbox"
                required
                className="mt-0.5 rounded border-slate-300 text-primary focus:ring-primary/20"
              />
              <span>
                I agree to the{' '}
                <Link to="/privacy-policy" target="_blank" className="text-primary hover:underline font-medium">
                  Privacy Policy
                </Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={isLoading || password.length < 8 || password !== confirmPassword}
              className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
              ) : null}
              Complete Registration
            </button>
          </form>
        )}

        {/* Bottom Login Redirect */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-dark-border text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-bold text-primary hover:text-primary-dark hover:underline"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
