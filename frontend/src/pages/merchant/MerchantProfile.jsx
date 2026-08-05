import { useState, useEffect } from 'react';
import { User, Building, MapPin, Clock, Lock, Save, X, Eye, EyeOff } from 'lucide-react';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { CATEGORIES, CATEGORY_CODES, normalizeCategory } from '../../constants/categories';
import { CITIES } from '../../constants/cities';

export default function MerchantProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('business');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [customCategory, setCustomCategory] = useState('');

  const [formData, setFormData] = useState({
    businessName: '',
    ownerName: '',
    email: '',
    alternativePhone: '',
    address: '',
    city: '',
    landmark: '',
    googleMapsUrl: '',
    openingTime: '',
    closingTime: '',
    workingDays: '',
    category: '',
  });

  const [originalData, setOriginalData] = useState({});
  const [originalCustomCategory, setOriginalCustomCategory] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/merchant/profile');
      const data = res.data.data;
      setProfile(data);
      const rawCategory = data.category || '';
      const normalized = normalizeCategory(rawCategory);
      const isKnownCode = CATEGORY_CODES.includes(normalized);
      const form = {
        businessName: data.businessName || '',
        ownerName: data.ownerName || '',
        email: data.email || '',
        alternativePhone: data.alternativePhone || '',
        address: data.address || '',
        city: CITIES.includes(data.city) ? data.city : '',
        landmark: data.landmark || '',
        googleMapsUrl: data.googleMapsUrl || '',
        openingTime: data.openingTime || '',
        closingTime: data.closingTime || '',
        workingDays: data.workingDays || '',
        category: isKnownCode ? normalized : 'other',
      };
      setCustomCategory(isKnownCode ? '' : rawCategory.trim());
      setOriginalCustomCategory(isKnownCode ? '' : rawCategory.trim());
      setFormData(form);
      setOriginalData(form);
    } catch (err) {
      toast.error('Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const modifiedCount = Object.keys(formData).filter(
    key => formData[key] !== originalData[key]
  ).length + (formData.category === 'other' && customCategory !== originalCustomCategory ? 1 : 0);

  const handleSave = async (e) => {
    e.preventDefault();
    if (modifiedCount === 0) return;
    try {
      setIsSaving(true);
      const payload = {
        ...formData,
        category: formData.category === 'other'
          ? customCategory.trim().toLowerCase()
          : formData.category,
      };
      await api.put('/api/merchant/profile', payload);
      toast.success('Profile updated successfully!');
      setOriginalData(formData);
      fetchProfile();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFormData(originalData);
    setCustomCategory(originalCustomCategory);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    try {
      setIsPasswordSaving(true);
      await api.put('/api/merchant/profile/password', { oldPassword, newPassword });
      toast.success('Password changed successfully!');
      setIsPasswordModalOpen(false);
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setIsPasswordSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  const labelClass = "block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1";

  const tabs = [
    { id: 'business', label: 'Business Info', icon: Building },
    { id: 'location', label: 'Location', icon: MapPin },
    { id: 'hours', label: 'Hours', icon: Clock },
    { id: 'security', label: 'Security', icon: Lock },
  ];

  if (loading) return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">My Profile</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your business information</p>
      </div>

      {/* Merchant Code Badge */}
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">Merchant Code</p>
          <p className="text-lg font-bold text-primary">{profile?.merchantCode}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Points Balance</p>
          <p className="text-lg font-bold text-emerald-600">{profile?.pointsBalance} pts</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Status</p>
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${profile?.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {profile?.status}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-slate-200 dark:border-slate-700">
        <div className="block md:hidden relative">
          {(() => {
            const activeIcon = tabs.find(t => t.id === activeTab)?.icon;
            return activeIcon ? (
              <activeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none" />
            ) : null;
          })()}
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-primary border border-primary rounded-xl text-sm font-semibold text-white focus:outline-none focus:ring-1 focus:ring-white/50 appearance-none cursor-pointer"
          >
            {tabs.map(tab => (
              <option key={tab.id} value={tab.id} className="text-slate-900">{tab.label}</option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
        <div className="hidden md:flex gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors shrink-0 ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              } btn-press`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSave}>
        {/* Business Info Tab */}
        {activeTab === 'business' && (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Business Name</label>
              <input name="businessName" value={formData.businessName} onChange={handleChange} className={inputClass} placeholder="Your business name" />
            </div>
            <div>
              <label className={labelClass}>Owner Name</label>
              <input name="ownerName" value={formData.ownerName} onChange={handleChange} className={inputClass} placeholder="Owner full name" />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input name="email" type="email" value={formData.email} onChange={handleChange} className={inputClass} placeholder="business@email.com" />
            </div>
            <div>
              <label className={labelClass}>Alternative Phone</label>
              <input name="alternativePhone" value={formData.alternativePhone} onChange={handleChange} className={inputClass} placeholder="Alternative contact number" maxLength={10} />
            </div>
            <div>
              <label className={labelClass}>Registered Mobile Number</label>
              <input
                type="text"
                value={profile?.user?.mobile || ''}
                readOnly
                className={`${inputClass} bg-slate-50 dark:bg-slate-800 cursor-not-allowed`}
                placeholder="Not available"
              />
              <p className="text-xs text-slate-400 mt-1">Visible to customers — contact admin to change</p>
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, category: e.target.value }));
                  if (e.target.value !== 'other') setCustomCategory('');
                }}
                className={inputClass}
              >
                <option value="">Select category</option>
                {CATEGORIES.map(({ code, label }) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
              {formData.category === 'other' && (
                <div className="mt-3">
                  <label className={labelClass}>Custom Category Name</label>
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. bakery, hardware, salon…"
                    maxLength={100}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">This will be saved as your business category.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Location Tab */}
        {activeTab === 'location' && (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Address</label>
              <textarea name="address" value={formData.address} onChange={handleChange} className={inputClass} rows={3} placeholder="Full shop address" />
            </div>
            <div>
              <label className={labelClass}>City</label>
              <select name="city" value={formData.city} onChange={handleChange} className={inputClass}>
                <option value="">Select city</option>
                {CITIES.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Landmark</label>
              <input name="landmark" value={formData.landmark} onChange={handleChange} className={inputClass} placeholder="Near landmark" />
            </div>
            <div>
              <label className={labelClass}>Google Maps URL</label>
              <div className="flex gap-2">
                <input name="googleMapsUrl" value={formData.googleMapsUrl} onChange={handleChange} className={`${inputClass} flex-1`} placeholder="https://maps.google.com/..." />
                <button type="button" title="Find your location on Google Maps" onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent((formData.address || '') + ', ' + (formData.city || ''))}`, '_blank')} className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors btn-press shrink-0">
                  <MapPin className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hours Tab */}
        {activeTab === 'hours' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Opening Time</label>
                <input name="openingTime" type="time" value={formData.openingTime} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Closing Time</label>
                <input name="closingTime" type="time" value={formData.closingTime} onChange={handleChange} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Working Days</label>
              <input name="workingDays" value={formData.workingDays} onChange={handleChange} className={inputClass} placeholder="e.g. Mon-Sat or Mon,Tue,Wed" />
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Password</p>
                  <p className="text-xs text-slate-500 mt-0.5">Change your account password</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition btn-press"
                >
                  Change Password
                </button>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Mobile Number</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">{profile?.user?.mobile || '—'}</p>
              <p className="text-xs text-slate-500 mt-1">Contact admin to change your registered mobile number</p>
            </div>
          </div>
        )}

        {/* Save Bar */}
        {modifiedCount > 0 && activeTab !== 'security' && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg px-6 py-3 flex items-center gap-4 z-50">
            <span className="text-sm text-slate-600 dark:text-slate-300">{modifiedCount} change{modifiedCount > 1 ? 's' : ''} unsaved</span>
            <button type="button" onClick={handleReset} className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 btn-press">
              <X className="w-3.5 h-3.5" /> Reset
            </button>
            <button type="submit" disabled={isSaving} className="flex items-center gap-1 px-4 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark disabled:opacity-50 btn-press">
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </form>

      {/* Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Change Password</h3>
              <button onClick={() => setIsPasswordModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl btn-press">×</button>
            </div>
            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div>
                <label className={labelClass}>Current Password</label>
                <div className="relative">
                  <input type={showOldPassword ? 'text' : 'password'} value={oldPassword} onChange={e => setOldPassword(e.target.value)} className={`${inputClass} pr-10`} required />
                  <button type="button" onClick={() => setShowOldPassword(!showOldPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 btn-press">
                    {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className={labelClass}>New Password</label>
                <div className="relative">
                  <input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} className={`${inputClass} pr-10`} required minLength={8} />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 btn-press">
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className={labelClass}>Confirm New Password</label>
                <div className="relative">
                  <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={`${inputClass} pr-10`} required />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 btn-press">
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm btn-press">Cancel</button>
                <button type="submit" disabled={isPasswordSaving} className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-sm disabled:opacity-50 btn-press">
                  {isPasswordSaving ? 'Saving...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
