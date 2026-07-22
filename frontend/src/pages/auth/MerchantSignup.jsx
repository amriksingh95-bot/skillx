import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Store, User, Smartphone, Lock, CheckCircle, ArrowLeft, Eye, EyeOff, Navigation2, ShieldCheck, Gift } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import SkillXTLogo from '../../components/SkillXTLogo';

export default function MerchantSignup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Form, 2: OTP verify
  const [formData, setFormData] = useState({
    businessName: '',
    ownerName: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    category: '',
    city: '',
    address: '',
    latitude: '',
    longitude: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [errors, setErrors] = useState({});
  const [successData, setSuccessData] = useState(null);
  const [referredByMerchantCode, setReferredByMerchantCode] = useState('');
  const [hasReferralFromUrl, setHasReferralFromUrl] = useState(false);

  // OTP state
  const [otp, setOtp] = useState('');
  const [otpArray, setOtpArray] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([]);
  const lastAttemptedOtp = useRef('');
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);

  useEffect(() => {
    if (lockoutTimer <= 0) return;
    const interval = setInterval(() => {
      setLockoutTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mcode = params.get('mcode');
    if (mcode) {
      setReferredByMerchantCode(mcode.toUpperCase());
      setHasReferralFromUrl(true);
    }
  }, []);

  const validate = () => {
    const newErrors = {};

    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Business name is required.';
    }

    if (!formData.ownerName.trim()) {
      newErrors.ownerName = 'Owner name is required.';
    }

    if (!formData.mobile) {
      newErrors.mobile = 'Mobile number is required.';
    } else if (!/^\d{10}$/.test(formData.mobile)) {
      newErrors.mobile = 'Mobile must be exactly 10 digits.';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required.';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required.';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const detectLocation = () => {
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({ ...prev, latitude: latitude.toString(), longitude: longitude.toString() }));
        
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await response.json();
          if (data.address?.city) {
            setFormData(prev => ({ ...prev, city: data.address.city }));
          } else if (data.address?.town) {
            setFormData(prev => ({ ...prev, city: data.address.town }));
          } else if (data.address?.village) {
            setFormData(prev => ({ ...prev, city: data.address.village }));
          } else if (data.display_name) {
            const cityPart = data.display_name.split(',')[0];
            setFormData(prev => ({ ...prev, city: cityPart }));
          }
        } catch (err) {
          setLocationError('Could not determine city name. Please enter manually.');
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (error) => {
        setIsDetectingLocation(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Location access denied. Please enable location permissions.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationError('Location information is unavailable.');
        } else {
          setLocationError('Could not detect location. Please enter manually.');
        }
      }
    );
  };

  // Step 1: Validate form, then send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      await api.post('/api/auth/request-otp', {
        mobile: formData.mobile,
        purpose: 'register_merchant'
      });
      toast.success('OTP sent to your mobile number.');
      setStep(2);
      setAttemptsRemaining(null);
      setOtpArray(['', '', '', '', '', '']);
      setOtp('');
      lastAttemptedOtp.current = '';
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send OTP.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
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
      await api.post('/api/auth/verify-otp', {
        mobile: formData.mobile,
        otp,
        purpose: 'register_merchant'
      });
      toast.success('OTP verified successfully!');
      // Auto-submit after successful verification
      await submitRegistration();
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

  // Final submission after OTP verified
  const submitRegistration = async () => {
    try {
      const res = await api.post('/api/auth/merchant-signup', {
        businessName: formData.businessName,
        ownerName: formData.ownerName,
        mobile: formData.mobile,
        password: formData.password,
        category: formData.category,
        city: formData.city,
        address: formData.address || undefined,
        latitude: formData.latitude || undefined,
        longitude: formData.longitude || undefined,
        referredByMerchantCode: referredByMerchantCode || undefined
      });

      setSuccessData({
        merchantCode: res.data.data.merchantCode,
        mobile: formData.mobile
      });
      toast.success('Application submitted successfully!');
    } catch (err) {
      const msg = err.response?.data?.message || 'Submission failed. Please try again.';
      toast.error(msg);
      // If submission fails after OTP, go back to form so user can retry
      setStep(1);
    }
  };

  if (successData) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] text-slate-100 flex flex-col items-center justify-center py-12 px-4 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#38bdf8]/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md flex flex-col items-center space-y-6 relative z-10 animate-screen">
          <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
            <CheckCircle className="w-16 h-16 text-emerald-400" />
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-md">
              Application Submitted!
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Your application is under review. We will contact you on{' '}
              <span className="font-bold text-white">{successData.mobile}</span>{' '}
              once approved.
            </p>
          </div>

          <div className="w-full bg-[#1a2035] border border-slate-800 rounded-2xl p-6 shadow-xl text-center space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Your Merchant Code</p>
            <p className="text-2xl font-black text-[#38bdf8] tracking-wider">
              {successData.merchantCode}
            </p>
            <p className="text-xs text-slate-500">
              Save this code for future reference.
            </p>
          </div>

          <Link
            to="/login"
            className="text-sm font-bold text-blue-400 hover:text-blue-300 hover:underline transition-colors"
          >
            Already activated? Login here
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-slate-100 flex flex-col items-center justify-center py-12 px-4 relative overflow-y-auto">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-screen {
          animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#38bdf8]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md flex flex-col items-center space-y-6 relative z-10 animate-screen">
        
        <Link
          to="/login"
          className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </Link>

        <div className="flex flex-col items-center text-center space-y-3">
          <SkillXTLogo size="lg" />
          <h1 className="text-2xl font-black tracking-tight text-white drop-shadow-md">
            Apply as a Merchant Partner
          </h1>
          <p className="text-sm text-slate-400 font-medium">
            Join SkillXT Rewards network in your city
          </p>
        </div>

        {/* Step Tracker */}
        <div className="flex items-center justify-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? 'bg-[#16a34a] text-white' : 'bg-slate-700 text-slate-400'}`}>
            {step > 1 ? <CheckCircle className="w-4 h-4" /> : '1'}
          </div>
          <div className={`w-10 h-0.5 ${step >= 2 ? 'bg-[#16a34a]' : 'bg-slate-700'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? 'bg-[#16a34a] text-white' : 'bg-slate-700 text-slate-400'}`}>
            2
          </div>
        </div>

        {/* STEP 1: FORM */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="w-full bg-[#1a2035] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            
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
                  name="businessName"
                  required
                  className={`w-full pl-10 pr-4 py-2.5 bg-[#0a0f1e] border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-[#16a34a] transition-all font-semibold ${errors.businessName ? 'border-red-500' : 'border-slate-700'}`}
                  placeholder="e.g. Fresh Mart"
                  value={formData.businessName}
                  onChange={handleChange}
                />
              </div>
              {errors.businessName && <p className="text-xs text-red-400 mt-1">{errors.businessName}</p>}
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
                  name="ownerName"
                  required
                  className={`w-full pl-10 pr-4 py-2.5 bg-[#0a0f1e] border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-[#16a34a] transition-all font-semibold ${errors.ownerName ? 'border-red-500' : 'border-slate-700'}`}
                  placeholder="e.g. Rahul Sharma"
                  value={formData.ownerName}
                  onChange={handleChange}
                />
              </div>
              {errors.ownerName && <p className="text-xs text-red-400 mt-1">{errors.ownerName}</p>}
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Mobile Number *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <Smartphone className="w-4 h-4 text-slate-400" />
                </span>
                <input
                  type="tel"
                  name="mobile"
                  required
                  maxLength={10}
                  className={`w-full pl-10 pr-4 py-2.5 bg-[#0a0f1e] border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-[#16a34a] transition-all font-semibold ${errors.mobile ? 'border-red-500' : 'border-slate-700'}`}
                  placeholder="9000000001"
                  value={formData.mobile}
                  onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                />
              </div>
              {errors.mobile && <p className="text-xs text-red-400 mt-1">{errors.mobile}</p>}
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
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  minLength={8}
                  className={`w-full pl-10 pr-10 py-2.5 bg-[#0a0f1e] border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-[#16a34a] transition-all font-semibold ${errors.password ? 'border-red-500' : 'border-slate-700'}`}
                  placeholder="Min 8 characters"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 btn-press"
                >
                  {showPassword ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Confirm Password *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <Lock className="w-4 h-4 text-slate-400" />
                </span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  required
                  className={`w-full pl-10 pr-10 py-2.5 bg-[#0a0f1e] border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-[#16a34a] transition-all font-semibold ${errors.confirmPassword ? 'border-red-500' : 'border-slate-700'}`}
                  placeholder="Re-enter password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 btn-press"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-xs text-red-400 mt-1">{errors.confirmPassword}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Category *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <Store className="w-4 h-4 text-slate-400" />
                </span>
                <select
                  name="category"
                  required
                  className={`w-full pl-10 pr-4 py-2.5 bg-[#0a0f1e] border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-[#16a34a] transition-all font-semibold appearance-none ${errors.category ? 'border-red-500' : 'border-slate-700'}`}
                  value={formData.category}
                  onChange={handleChange}
                >
                  <option value="">Select category</option>
                  <option value="everyday">Everyday (Grocery, Food, Pharmacy)</option>
                  <option value="lifestyle">Lifestyle (Salon, Gym, Clothing)</option>
                  <option value="premium">Premium (Jewellery, Electronics)</option>
                </select>
              </div>
              {errors.category && <p className="text-xs text-red-400 mt-1">{errors.category}</p>}
            </div>

            {/* City */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                City *
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </span>
                  <input
                    type="text"
                    name="city"
                    required
                    className={`w-full pl-10 pr-4 py-2.5 bg-[#0a0f1e] border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-[#16a34a] transition-all font-semibold ${errors.city ? 'border-red-500' : 'border-slate-700'}`}
                    placeholder="e.g. Ludhiana"
                    value={formData.city}
                    onChange={handleChange}
                  />
                </div>
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={isDetectingLocation}
                  className="px-3 py-2.5 bg-[#38bdf8]/10 text-[#38bdf8] rounded-xl text-xs font-bold hover:bg-[#38bdf8]/20 transition-all disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap btn-press"
                  title="Detect My Location"
                >
                  {isDetectingLocation ? (
                    <span className="w-3 h-3 border border-[#38bdf8] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Navigation2 className="w-3.5 h-3.5" />
                  )}
                  Detect
                </button>
              </div>
              {errors.city && <p className="text-xs text-red-400 mt-1">{errors.city}</p>}
              {locationError && <p className="text-xs text-red-400 mt-1">{locationError}</p>}
            </div>

            {/* Address */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Address (optional)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </span>
                <input
                  type="text"
                  name="address"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0a0f1e] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-[#16a34a] transition-all font-semibold"
                  placeholder="Street, Area (optional)"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Referral Code (optional) */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Referral Code (optional)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <Gift className="w-4 h-4 text-slate-400" />
                </span>
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0a0f1e] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-[#16a34a] transition-all font-semibold uppercase"
                  placeholder="Enter referral code"
                  value={referredByMerchantCode}
                  onChange={(e) => setReferredByMerchantCode(e.target.value.toUpperCase())}
                  readOnly={hasReferralFromUrl}
                />
              </div>
              {hasReferralFromUrl && (
                <p className="text-xs text-emerald-400 mt-1">Referral code applied from link</p>
              )}
            </div>

            <label className="flex items-start gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                required
                className="mt-0.5 rounded border-slate-600 text-[#16a34a] focus:ring-emerald-500/20"
              />
              <span>
                I agree to the{' '}
                <Link to="/privacy-policy" target="_blank" className="text-[#38bdf8] hover:underline font-medium">
                  Privacy Policy
                </Link>
              </span>
            </label>

            {/* Send OTP Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-[#16a34a] hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {isLoading && <span className="w-3 h-3 border-2 border-white border-t-transparent animate-spin rounded-full" />}
              Send OTP &amp; Verify Mobile
            </button>
          </form>
        )}

        {/* STEP 2: OTP VERIFICATION */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="w-full bg-[#1a2035] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 bg-[#38bdf8]/10 text-[#38bdf8] rounded-full border border-[#38bdf8]/20">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="font-extrabold text-base text-white">Verify Your Mobile</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Enter the 6-digit code sent to <span className="font-bold text-white">{formData.mobile}</span>
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 text-center">
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
                    className="w-11 h-11 text-center text-lg font-bold bg-[#0a0f1e] border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-[#16a34a] transition-all disabled:opacity-60 font-mono"
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
                className="flex-1 py-3 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 btn-press"
              >
                Go Back
              </button>
              <button
                type="submit"
                disabled={isLoading || lockoutTimer > 0}
                className="flex-1 py-3 bg-[#16a34a] hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 btn-press"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                ) : null}
                {lockoutTimer > 0 ? `Retry in ${lockoutTimer}s...` : 'Verify OTP'}
              </button>
            </div>
          </form>
        )}

        <p className="text-xs text-slate-400 text-center">
          Already a merchant partner?{' '}
          <Link to="/login" className="font-bold text-emerald-400 hover:text-emerald-300 hover:underline">
            Login here
          </Link>
        </p>

      </div>
    </div>
  );
}
