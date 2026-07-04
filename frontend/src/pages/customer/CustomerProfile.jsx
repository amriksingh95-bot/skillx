import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  User, Mail, Smartphone, Lock, Award, Calendar, 
  MapPin, Check, Copy, Heart, Shield, Sparkles,
  PhoneCall, KeyRound, AlertTriangle, QrCode, Wallet
} from 'lucide-react';
import toast from 'react-hot-toast';
import Badge from '../../components/Badge';
import { copyReferralCode, buildReferralUrl } from '../../services/referral';
import Modal from '../../components/Modal';
import { QRCodeSVG } from 'qrcode.react';

export default function CustomerProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personal');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    dateOfBirth: '',
    gender: '',
    city: '',
    pinCode: '',
    area: '',
    occupation: '',
    maritalStatus: '',
    anniversaryDate: '',
    numberOfChildren: 0,
    preferredLanguage: 'English',
    communicationPref: 'email',
    favouriteCategories: [],
    dietaryPreference: '',
    notificationOptIn: true,
    profilePhoto: '',
    alternativePhone: '',
  });

  const [originalData, setOriginalData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Mobile verification modal states
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  const [requestOtpLoading, setRequestOtpLoading] = useState(false);
  const [submitMobileLoading, setSubmitMobileLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [mobileOtp, setMobileOtp] = useState('');
  const [newMobileNumber, setNewMobileNumber] = useState('');

  // Password change modal states
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/api/customer/profile');
      const data = res.data.data;
      setProfile(data);
      
      const initialForm = {
        name: data.name || '',
        email: data.email || '',
        dateOfBirth: data.dateOfBirth ? data.dateOfBirth.substring(0, 10) : '',
        gender: data.gender || '',
        city: data.city || '',
        pinCode: data.pinCode || '',
        area: data.area || '',
        occupation: data.occupation || '',
        maritalStatus: data.maritalStatus || '',
        anniversaryDate: data.anniversaryDate ? data.anniversaryDate.substring(0, 10) : '',
        numberOfChildren: data.numberOfChildren !== undefined ? data.numberOfChildren : 0,
        preferredLanguage: data.preferredLanguage || 'English',
        communicationPref: data.communicationPref || 'email',
        favouriteCategories: data.favouriteCategories || [],
        dietaryPreference: data.dietaryPreference || '',
        notificationOptIn: data.notificationOptIn !== undefined ? data.notificationOptIn : true,
        profilePhoto: data.profilePhoto || '',
        alternativePhone: data.alternativePhone || ''
      };
      
      setFormData(initialForm);
      setOriginalData(initialForm);
    } catch (err) {
      toast.error('Failed to load profile details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCheckboxChange = (category) => {
    setFormData(prev => {
      const current = prev.favouriteCategories;
      const updated = current.includes(category)
        ? current.filter(c => c !== category)
        : [...current, category];
      return { ...prev, favouriteCategories: updated };
    });
  };

  // Detect which fields are modified
  const getModifiedFields = () => {
    const modified = {};
    Object.keys(formData).forEach(key => {
      if (Array.isArray(formData[key])) {
        // Compare arrays
        const orig = originalData[key] || [];
        const curr = formData[key] || [];
        if (orig.length !== curr.length || !orig.every(val => curr.includes(val))) {
          modified[key] = true;
        }
      } else if (formData[key] !== originalData[key]) {
        modified[key] = true;
      }
    });
    return modified;
  };

  const modifiedFields = getModifiedFields();
  const modifiedCount = Object.keys(modifiedFields).length;

  const handleCopyReferral = () => {
    if (profile?.referralCode) {
      copyReferralCode(profile.referralCode);
      toast.success('Referral code copied to clipboard!');
    }
  };

  // Submit Profile Form
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (modifiedCount === 0) return;

    setIsSaving(true);
    setSaveMessage('');
    try {
      const res = await api.put('/api/customer/profile', formData);
      toast.success('Profile updated successfully!');
      
      // Update local states
      const data = res.data.data;
      setProfile(data);
      const updatedForm = {
        name: data.name || '',
        email: data.email || '',
        dateOfBirth: data.dateOfBirth ? data.dateOfBirth.substring(0, 10) : '',
        gender: data.gender || '',
        city: data.city || '',
        pinCode: data.pinCode || '',
        area: data.area || '',
        occupation: data.occupation || '',
        maritalStatus: data.maritalStatus || '',
        anniversaryDate: data.anniversaryDate ? data.anniversaryDate.substring(0, 10) : '',
        numberOfChildren: data.numberOfChildren !== undefined ? data.numberOfChildren : 0,
        preferredLanguage: data.preferredLanguage || 'English',
        communicationPref: data.communicationPref || 'email',
        favouriteCategories: data.favouriteCategories || [],
        dietaryPreference: data.dietaryPreference || '',
        notificationOptIn: data.notificationOptIn !== undefined ? data.notificationOptIn : true,
        profilePhoto: data.profilePhoto || ''
      };
      setFormData(updatedForm);
      setOriginalData(updatedForm);
      setSaveMessage(`${modifiedCount} field(s) updated successfully`);
      setTimeout(() => setSaveMessage(''), 4000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save profile changes.';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Mobile Change OTP request
  const handleRequestMobileOtp = async () => {
    setRequestOtpLoading(true);
    try {
      const res = await api.post('/api/customer/profile/mobile/request-otp');
      setOtpSent(true);
      toast.success('OTP code sent successfully!');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to request verification code.';
      toast.error(msg);
    } finally {
      setRequestOtpLoading(false);
    }
  };

  // Mobile Change Submit
  const handleVerifyAndUpdateMobile = async (e) => {
    e.preventDefault();
    if (!newMobileNumber || !/^[6-9]\d{9}$/.test(newMobileNumber)) {
      return toast.error('Please enter a valid 10-digit Indian mobile number.');
    }
    if (!mobileOtp) {
      return toast.error('OTP code is required.');
    }

    setSubmitMobileLoading(true);
    try {
      await api.put('/api/customer/profile/mobile', {
        otp: mobileOtp,
        newMobile: newMobileNumber
      });
      toast.success('Mobile number updated successfully!');
      setIsMobileModalOpen(false);
      setProfile(prev => ({ ...prev, mobile: newMobileNumber }));
      setNewMobileNumber('');
      setMobileOtp('');
      setOtpSent(false);
      setDevOtp(null);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to verify OTP and update mobile.';
      toast.error(msg);
    } finally {
      setSubmitMobileLoading(false);
    }
  };

  // Password Change
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      return toast.error('New password must be at least 8 characters.');
    }
    if (newPassword !== confirmPassword) {
      return toast.error('Passwords do not match.');
    }

    setIsPasswordSaving(true);
    try {
      const res = await api.put('/api/customer/profile/password', { oldPassword, newPassword });
      toast.success(res.data.message || 'Password changed successfully!');
      setIsPasswordModalOpen(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to change password.';
      toast.error(msg);
    } finally {
      setIsPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <span className="w-12 h-12 border-4 border-primary border-t-transparent animate-spin rounded-full" />
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-4">Loading your profile details...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="p-3 bg-red-500/10 text-red-500 rounded-full border border-red-500/20 animate-pulse">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Failed to load profile</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">There was an error retrieving your profile data.</p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchProfile();
          }}
          className="px-6 py-2.5 bg-primary text-white font-extrabold rounded-xl transition-all hover:bg-primary-dark shadow-sm text-xs"
        >
          Retry
        </button>
      </div>
    );
  }

  const categoryOptions = [
    'Grocery', 'Cafe & Restaurant', 'Beauty & Salon', 'Doctor & Clinic',
    'Pharmacy', 'Fashion & Clothing', 'Stationery', 'Gym & Fitness',
    'Electronics', 'Education', 'Hotel & Travel'
  ];

  const initials = profile?.name
    ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
    : 'U';

  return (
    <div className="space-y-6 pb-20 relative">
      {/* SECTION 1 — PROFILE HEADER CARD */}
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-3xl p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white text-3xl font-black shadow-md border-2 border-white dark:border-dark-card">
              {profile.profilePhoto ? (
                <img src={profile.profilePhoto} alt={profile.name} className="w-full h-full object-cover rounded-full" />
              ) : (
                initials
              )}
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">{profile.name}</h2>
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1 uppercase tracking-wide">
                  <Check className="w-3 h-3" /> Active Member
                </span>
                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(true)}
                  className="px-3 py-1 bg-primary text-white hover:bg-primary-dark rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <QrCode className="w-3.5 h-3.5" /> My QR Code
                </button>
              </div>

              {/* Mobile & Email status */}
              <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/40 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700/40">
                  <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                  <span>+91 {profile.mobile}</span>
                  <Lock className="w-3 h-3 text-amber-500 ml-1 cursor-pointer" onClick={() => setIsMobileModalOpen(true)} title="Secure number. Change via OTP." />
                </div>
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/40 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700/40">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{profile.email || 'No email saved'}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Member Since: {new Date(profile.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Referral card inside header */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-5 rounded-2xl w-full md:w-auto min-w-[280px] shadow-inner flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Your Referral Code</span>
            <div className="flex items-center justify-between gap-3 mt-2">
              <span className="font-mono text-base font-black text-slate-900 dark:text-white bg-white dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 select-all tracking-wider">
                {profile.referralCode || 'SKXTXXXX0000'}
              </span>
              <button 
                onClick={handleCopyReferral}
                className="p-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/40 rounded-xl transition-all shadow-sm"
                title="Copy Referral Code"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-3 font-semibold leading-relaxed">
              Share code with friends. Both earn 20 points!
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 2 — LOYALTY STATS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lifetime Points</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 flex items-center gap-1.5">
            <Award className="w-5 h-5 text-emerald-500" />
            {profile.stats?.lifetimeEarned?.toLocaleString('en-IN') ?? 0}
          </p>
        </div>

        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Balance</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 flex items-center gap-1.5">
            <Wallet className="w-5 h-5 text-primary" />
            {profile.balance?.toLocaleString('en-IN') ?? 0}
          </p>
        </div>

        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Redeemed</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 flex items-center gap-1.5">
            <Check className="w-5 h-5 text-amber-500" />
            {profile.stats?.lifetimeRedeemed?.toLocaleString('en-IN') ?? 0}
          </p>
        </div>

        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Visits</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 flex items-center gap-1.5">
            <Calendar className="w-5 h-5 text-indigo-500" />
            {profile.stats?.totalVisits ?? 0}
          </p>
        </div>
      </div>

      {/* SECTION 3 — EDIT PROFILE FORM & TABS */}
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm">
        {/* Tab Header Strip */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto scrollbar-none bg-slate-50 dark:bg-slate-900/30">
          {[
            { id: 'personal', label: '👤 Personal Information' },
            { id: 'location', label: '📍 Location' },
            { id: 'preferences', label: '❤️ Preferences' },
            { id: 'security', label: '🛡️ Account & Security' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 text-xs font-black tracking-wide border-b-2 whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Body Contents */}
        <form onSubmit={handleSaveProfile} className="p-6 md:p-8 space-y-6">
          {activeTab === 'personal' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Full Name *</label>
                <input
                  type="text"
                  required
                  className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border rounded-xl text-sm transition-all focus:outline-none focus:ring-1 focus:ring-primary ${
                    modifiedFields.name ? 'border-primary text-primary font-semibold' : 'border-slate-200 dark:border-slate-900 text-slate-900 dark:text-white'
                  }`}
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Date of Birth</label>
                <input
                  type="date"
                  className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border rounded-xl text-sm transition-all focus:outline-none focus:ring-1 focus:ring-primary ${
                    modifiedFields.dateOfBirth ? 'border-primary text-primary font-semibold' : 'border-slate-200 dark:border-slate-900 text-slate-900 dark:text-white'
                  }`}
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Gender</label>
                <select
                  className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border rounded-xl text-sm transition-all focus:outline-none focus:ring-1 focus:ring-primary ${
                    modifiedFields.gender ? 'border-primary text-primary font-semibold' : 'border-slate-200 dark:border-slate-900 text-slate-900 dark:text-white'
                  }`}
                  value={formData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Marital Status</label>
                <select
                  className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border rounded-xl text-sm transition-all focus:outline-none focus:ring-1 focus:ring-primary ${
                    modifiedFields.maritalStatus ? 'border-primary text-primary font-semibold' : 'border-slate-200 dark:border-slate-900 text-slate-900 dark:text-white'
                  }`}
                  value={formData.maritalStatus}
                  onChange={(e) => handleInputChange('maritalStatus', e.target.value)}
                >
                  <option value="">Select Marital Status</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {formData.maritalStatus === 'Married' && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Anniversary Date</label>
                  <input
                    type="date"
                    className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border rounded-xl text-sm transition-all focus:outline-none focus:ring-1 focus:ring-primary ${
                      modifiedFields.anniversaryDate ? 'border-primary text-primary font-semibold' : 'border-slate-200 dark:border-slate-900 text-slate-900 dark:text-white'
                    }`}
                    value={formData.anniversaryDate}
                    onChange={(e) => handleInputChange('anniversaryDate', e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Number of Children</label>
                <input
                  type="number"
                  min={0}
                  className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border rounded-xl text-sm transition-all focus:outline-none focus:ring-1 focus:ring-primary ${
                    modifiedFields.numberOfChildren ? 'border-primary text-primary font-semibold' : 'border-slate-200 dark:border-slate-900 text-slate-900 dark:text-white'
                  }`}
                  value={formData.numberOfChildren}
                  onChange={(e) => handleInputChange('numberOfChildren', parseInt(e.target.value) || 0)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Occupation</label>
                <input
                  type="text"
                  placeholder="e.g. Engineer, Teacher, Doctor..."
                  className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border rounded-xl text-sm transition-all focus:outline-none focus:ring-1 focus:ring-primary ${
                    modifiedFields.occupation ? 'border-primary text-primary font-semibold' : 'border-slate-200 dark:border-slate-900 text-slate-900 dark:text-white'
                  }`}
                  value={formData.occupation}
                  onChange={(e) => handleInputChange('occupation', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Alternative Phone</label>
                <input
                  name="alternativePhone"
                  value={formData.alternativePhone || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Alternative contact number"
                  maxLength={10}
                />
              </div>
            </div>
          )}

          {activeTab === 'location' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">City</label>
                <input
                  type="text"
                  placeholder="e.g. Ludhiana"
                  className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border rounded-xl text-sm transition-all focus:outline-none focus:ring-1 focus:ring-primary ${
                    modifiedFields.city ? 'border-primary text-primary font-semibold' : 'border-slate-200 dark:border-slate-900 text-slate-900 dark:text-white'
                  }`}
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Area / Locality</label>
                <input
                  type="text"
                  placeholder="e.g. Sarabha Nagar"
                  className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border rounded-xl text-sm transition-all focus:outline-none focus:ring-1 focus:ring-primary ${
                    modifiedFields.area ? 'border-primary text-primary font-semibold' : 'border-slate-200 dark:border-slate-900 text-slate-900 dark:text-white'
                  }`}
                  value={formData.area}
                  onChange={(e) => handleInputChange('area', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Pin Code (6 Digits)</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 141001"
                  className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border rounded-xl text-sm transition-all focus:outline-none focus:ring-1 focus:ring-primary ${
                    modifiedFields.pinCode ? 'border-primary text-primary font-semibold' : 'border-slate-200 dark:border-slate-900 text-slate-900 dark:text-white'
                  }`}
                  value={formData.pinCode}
                  onChange={(e) => handleInputChange('pinCode', e.target.value.replace(/\D/g, ''))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Preferred Language</label>
                <select
                  className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border rounded-xl text-sm transition-all focus:outline-none focus:ring-1 focus:ring-primary ${
                    modifiedFields.preferredLanguage ? 'border-primary text-primary font-semibold' : 'border-slate-200 dark:border-slate-900 text-slate-900 dark:text-white'
                  }`}
                  value={formData.preferredLanguage}
                  onChange={(e) => handleInputChange('preferredLanguage', e.target.value)}
                >
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Punjabi">Punjabi</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-6">
              {/* Checkboxes Grid */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-3">Favourite Categories</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {categoryOptions.map(cat => {
                    const isChecked = formData.favouriteCategories.includes(cat);
                    return (
                      <label key={cat} className="flex items-center gap-2.5 p-3 bg-slate-50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-900/60 border border-slate-200 dark:border-slate-900 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleCheckboxChange(cat)}
                          className="rounded text-primary focus:ring-primary bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800 w-4 h-4"
                        />
                        <span className={isChecked ? 'text-primary' : ''}>{cat}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Dietary Preference — standalone card */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">🥗</span>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Dietary Preference</label>
                </div>
                <select
                  className={`w-full px-4 py-2.5 bg-white dark:bg-slate-900 border rounded-xl text-sm transition-all focus:outline-none focus:ring-1 focus:ring-primary ${
                    modifiedFields.dietaryPreference ? 'border-primary text-primary font-semibold' : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                  }`}
                  value={formData.dietaryPreference}
                  onChange={(e) => handleInputChange('dietaryPreference', e.target.value)}
                >
                  <option value="">Select Option</option>
                  <option value="Vegetarian">Vegetarian</option>
                  <option value="Non-Vegetarian">Non-Vegetarian</option>
                  <option value="Vegan">Vegan</option>
                  <option value="No preference">No preference</option>
                </select>
              </div>

              {/* Visual separator */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/60" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">Notification Settings</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/60" />
              </div>

              {/* Communication Preference — standalone card */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">📣</span>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Communication Preference</label>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-3">How would you like us to reach you?</p>
                <div className="flex flex-wrap gap-3">
                  {[
                    { id: 'email', label: 'Email' },
                    { id: 'whatsapp', label: 'WhatsApp' },
                    { id: 'sms', label: 'SMS' },
                    { id: 'all', label: 'All' }
                  ].map(pref => {
                    const isSelected = formData.communicationPref === pref.id;
                    return (
                      <label
                        key={pref.id}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-primary/10 border-primary text-primary dark:bg-primary/20'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary/40'
                        }`}
                      >
                        <input
                          type="radio"
                          name="comm_pref"
                          checked={isSelected}
                          onChange={() => handleInputChange('communicationPref', pref.id)}
                          className="text-primary focus:ring-primary bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800 w-4 h-4"
                        />
                        {pref.label}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="h-px bg-slate-200 dark:bg-slate-800/60 my-4" />

              {/* Notification toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/35 border border-slate-200 dark:border-slate-900 rounded-2xl">
                <div>
                  <span className="block text-xs font-bold text-slate-900 dark:text-white">Receive Notifications</span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Opt-in to get point transaction notifications and promo alerts</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleInputChange('notificationOptIn', !formData.notificationOptIn)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${
                    formData.notificationOptIn ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-all duration-300 ${
                    formData.notificationOptIn ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Current Email</label>
                  <input
                    type="email"
                    className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border rounded-xl text-sm transition-all focus:outline-none focus:ring-1 focus:ring-primary ${
                      modifiedFields.email ? 'border-primary text-primary font-semibold' : 'border-slate-200 dark:border-slate-900 text-slate-900 dark:text-white'
                    }`}
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Referrer Network info</label>
                  <input
                    type="text"
                    disabled
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/80 rounded-xl text-sm text-slate-400 font-bold font-sans cursor-not-allowed"
                    value={profile.referredByName ? `Referred by: ${profile.referredByName}` : 'No referrer associated'}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-200 dark:border-slate-800/40">
                <button
                  type="button"
                  onClick={() => setIsMobileModalOpen(true)}
                  className="px-5 py-3 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-900 dark:text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2"
                >
                  <Smartphone className="w-4 h-4 text-slate-400" />
                  Change Mobile Number
                </button>

                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="px-5 py-3 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-900 dark:text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2"
                >
                  <KeyRound className="w-4 h-4 text-slate-400" />
                  Change Password
                </button>
              </div>
            </div>
          )}

          {/* Sticky Save Bar */}
          {modifiedCount > 0 && (
            <div className="fixed bottom-0 left-0 right-0 z-10 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 px-6 md:px-12 flex items-center justify-between shadow-2xl animate-slideUp">
              <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300">
                {modifiedCount} field(s) changed
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(originalData)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition-all"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-black rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2"
                >
                  {isSaving ? <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" /> : null}
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {saveMessage && (
        <div className="fixed bottom-6 right-6 z-25 bg-primary border border-primary-dark text-white font-extrabold text-xs px-5 py-3.5 rounded-2xl shadow-xl animate-fadeIn">
          {saveMessage}
        </div>
      )}

      {/* MOBILE CHANGE OTP MODAL */}
      {isMobileModalOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-3xl w-full max-w-md p-6 shadow-2xl relative space-y-5 animate-scaleUp">
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" /> Change Mobile Number
            </h3>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              For security, verification is required first. An OTP code will be sent to your current connection.
            </p>

            {!otpSent ? (
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-900 rounded-xl flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Request will trigger SMS to: +91 {profile.mobile}</span>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setIsMobileModalOpen(false)}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRequestMobileOtp}
                    disabled={requestOtpLoading}
                    className="flex-1 py-3 bg-primary hover:bg-primary-dark text-white text-xs font-black rounded-xl shadow-md flex items-center justify-center gap-1.5"
                  >
                    {requestOtpLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" /> : null}
                    Send OTP Code
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleVerifyAndUpdateMobile} className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">New Mobile Number (Indian)</label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-900 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Enter new 10-digit number"
                      value={newMobileNumber}
                      onChange={(e) => setNewMobileNumber(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Enter 6-Digit OTP</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-900 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary font-mono tracking-widest text-center text-lg"
                      placeholder="------"
                      value={mobileOtp}
                      onChange={(e) => setMobileOtp(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setDevOtp(null);
                      setMobileOtp('');
                    }}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800"
                  >
                    Go Back
                  </button>
                  <button
                    type="submit"
                    disabled={submitMobileLoading}
                    className="flex-1 py-3 bg-primary hover:bg-primary-dark text-white text-xs font-black rounded-xl shadow-md flex items-center justify-center gap-1.5"
                  >
                    {submitMobileLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" /> : null}
                    Verify & Save
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* PASSWORD CHANGE MODAL */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-3xl w-full max-w-md p-6 shadow-2xl relative space-y-5 animate-scaleUp">
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" /> Update Password
            </h3>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Current Password</label>
                <input
                  type="password"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-900 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                  placeholder="Enter current password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-900 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Confirm New Password</label>
                <input
                  type="password"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-900 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs font-bold text-rose-500 mt-1">New passwords do not match</p>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPasswordSaving || newPassword.length < 6 || newPassword !== confirmPassword}
                  className="flex-1 py-3 bg-primary hover:bg-primary-dark text-white text-xs font-black rounded-xl shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isPasswordSaving ? <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" /> : null}
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
          <p className="text-xs text-slate-400 mt-3 max-w-xs text-center">
            Present this QR code to the merchant to easily earn or redeem points.
          </p>
        </div>
      </Modal>
    </div>
  );
}
