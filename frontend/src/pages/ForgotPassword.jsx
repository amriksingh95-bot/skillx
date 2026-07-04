import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { Award, Smartphone, ShieldCheck, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Identifier entry, 2: OTP & New Password entry
  
  const [identifier, setIdentifier] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);

  const [otpArray, setOtpArray] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([]);

  React.useEffect(() => {
    if (lockoutTimer <= 0) return;
    const interval = setInterval(() => {
      setLockoutTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  const handleResetPasswordRef = React.useRef(null);
  const hasAutoSubmitted = React.useRef(false);

  React.useEffect(() => {
    if (
      step === 2 &&
      otp.length === 6 &&
      newPassword.length >= 8 &&
      confirmPassword.length >= 8 &&
      newPassword === confirmPassword &&
      lockoutTimer <= 0 &&
      !isLoading &&
      !hasAutoSubmitted.current
    ) {
      hasAutoSubmitted.current = true;
      handleResetPasswordRef.current();
    }
  }, [otp, newPassword, confirmPassword, step, lockoutTimer, isLoading]);

  React.useEffect(() => {
    hasAutoSubmitted.current = false;
  }, [step]);

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

  // Step 1: Request Password Reset OTP
  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (!identifier) {
      return toast.error('Please enter your mobile number.');
    }

    setIsLoading(true);
    try {
      const response = await api.post('/api/auth/request-reset', { identifier });
      toast.success(response.data.message || 'OTP sent successfully.');
      console.log('Reset response:', response.data);
      setMobile(response.data.data?.mobile || identifier); // Save mobile for reset call
      setStep(2);
      setAttemptsRemaining(null);
      setOtpArray(['', '', '', '', '', '']);
      setOtp('');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to locate user account.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Reset Password
  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    if (!otp) {
      return toast.error('Please enter the OTP.');
    }
    if (otp.length !== 6) {
      return toast.error('OTP must be exactly 6 digits.');
    }
    if (!newPassword || !confirmPassword) {
      return toast.error('Please fill in all fields.');
    }
    if (lockoutTimer > 0) {
      return toast.error(`Verification locked. Please wait ${lockoutTimer} seconds.`);
    }
    if (newPassword.length < 8) {
      return toast.error('Password must be at least 8 characters long.');
    }
    if (newPassword !== confirmPassword) {
      return toast.error('Passwords do not match.');
    }

    setIsLoading(true);
    try {
      console.log('Submitting reset with mobile:', mobile, 'otp:', otp);
      const response = await api.post('/api/auth/reset-password', {
        mobile,
        otp,
        newPassword
      });
      toast.success(response.data.message || 'Password updated successfully!');
      navigate('/login');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to reset password.';
      toast.error(msg);
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

  handleResetPasswordRef.current = handleResetPassword;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-darkBg transition-colors duration-200">
      <div className="w-full max-w-md bg-white dark:bg-dark-card rounded-3xl shadow-xl border border-slate-100 dark:border-dark-border p-8">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-primary text-white rounded-2xl mb-4">
            <Award className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black text-slate-800 dark:text-white">Reset Password</h1>
          <p className="text-sm text-slate-400 dark:text-slate-400 mt-1">
            Recover your SkillXT Reward account access
          </p>
        </div>

        {/* Form Steps */}

        {/* STEP 1: IDENTIFIER */}
        {step === 1 && (
          <form onSubmit={handleRequestReset} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-2">
                Mobile Number
              </label>
<div className="relative">
                 <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                   <Smartphone className="w-4 h-4" />
                 </span>
                 <input
                   type="text"
                   required
                   maxLength={10}
                   className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                   placeholder="9000000001"
                   value={identifier}
                   onChange={(e) => setIdentifier(e.target.value)}
                 />
               </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20 hover:shadow-lg transition-all focus:outline-none flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
              ) : null}
              Send Recovery OTP
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STEP 2: VERIFY AND SET PASSWORD */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-5">
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

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-2">
                New Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold"
                  placeholder="Min 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs font-bold text-rose-500 mt-1.5">Passwords do not match</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isLoading || lockoutTimer > 0}
                className="flex-1 py-3 border border-slate-200 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Go Back
              </button>
              <button
                type="submit"
                disabled={isLoading || lockoutTimer > 0 || newPassword.length < 8 || newPassword !== confirmPassword}
                className="flex-1 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                ) : null}
                {lockoutTimer > 0 ? `Try again in ${lockoutTimer}s...` : 'Reset Password'}
              </button>
            </div>
          </form>
        )}

        {/* Bottom Login Redirect */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-dark-border text-center">
          <Link
            to="/login"
            className="font-semibold text-sm text-slate-500 hover:text-primary transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
