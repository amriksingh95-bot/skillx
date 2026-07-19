import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { Megaphone, X, Copy, Check, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import AdStepper from '../../components/AdStepper';
import Badge from '../../components/Badge';
import { THEMES, ICONS } from '../../constants/adThemes';
import gpayQR from '../../assets/gpay-qr.png';

export default function MerchantPromote() {
  // Loading state
  const [loading, setLoading] = useState(true);
  const [merchantProfile, setMerchantProfile] = useState(null);

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
  const [upiCopied, setUpiCopied] = useState(false);
  const [successAdId, setSuccessAdId] = useState(null);
  const adPaymentUploadRef = useRef(null);

  const fetchMyAds = async () => {
    try {
      const res = await api.get('/api/merchant/ads');
      setMyAds(res.data.data || []);
    } catch (err) {
      console.error('Promote page fetch error:', err);
    }
  };

  const fetchMerchantProfile = async () => {
    try {
      const res = await api.get('/api/merchant/profile');
      setMerchantProfile(res.data.data);
    } catch (err) {
      console.error('Promote page fetch error:', err);
    }
  };

  useEffect(() => {
    const initData = async () => {
      try {
        await Promise.allSettled([fetchMyAds(), fetchMerchantProfile()]);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  useEffect(() => {
    if (payingAdId && adPaymentId && adPaymentUploadRef.current) {
      requestAnimationFrame(() => {
        adPaymentUploadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, [payingAdId, adPaymentId]);

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
      setSuccessAdId(payingAdId);
      setTimeout(() => setSuccessAdId(null), 3000);
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

  const handleCloseAdPaymentModal = () => {
    setPayingAdId(null);
    setAdPaymentId(null);
    setAdScreenshot(null);
    setAdPaymentUpiId('');
    setAdPaymentAmount(0);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div id="promote-section" className="space-y-6 pt-6 border-t border-slate-200 dark:border-slate-800">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
          <span>🚀</span> Promote your business
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
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
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description / Offer Details (Optional)</label>
            <textarea
              rows={3}
              maxLength={150}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-800 dark:text-white resize-none"
              placeholder="Briefly describe what your offer is, e.g. Valid on all orders above ₹500. Show coupon code at counter."
              value={adDescription}
              onChange={(e) => setAdDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const newlineCount = (adDescription.match(/\n/g) || []).length;
                  if (newlineCount >= 4) e.preventDefault();
                }
              }}
            />
            <div className={`text-xs mt-1 text-right ${adDescription.length >= 150 ? 'text-red-500' : 'text-slate-400'}`}>
              {adDescription.length}/150
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Brand Theme</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(THEMES).map(([key, theme]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAdTheme(key)}
                  className={`w-10 h-10 rounded-full transition-all btn-press`}
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
                  className={`p-3 rounded-xl transition-all flex flex-col items-center justify-center text-xs ${adIcon === key ? 'border-2 border-cyan-400 bg-cyan-50/20' : 'border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'} btn-press`}
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
                  minHeight: 160,
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
                      grid-template-rows: auto auto auto !important;
                    }
                    .ap-arrow-first { grid-column: 1; }
                    .ap-brand { grid-column: 2 / -1; }
                    .ap-headline { grid-column: 2; }
                    .ap-badge { grid-column: 2 / -1; grid-row: 3; justify-self: end; margin-right: 36px; }
                    .ap-arrow-last { grid-column: 3; grid-row: auto; justify-self: auto; margin-right: 0; font-size: inherit; }
                  }
                `}</style>

                {/* Arrow spacer */}
                <div className="ap-arrow-first"></div>

                {/* Brand identity - use stats for merchant info */}
                <div className="ap-brand" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                      {merchantProfile?.businessName || 'Your Business Name'}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', whiteSpace: 'normal', wordBreak: 'break-word', marginTop: 2 }}>
                      {merchantProfile?.address || merchantProfile?.city || 'Location not set'}
                    </div>
                  </div>
                </div>

                {/* Headline + Description */}
                <div className="ap-headline" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: '#fff', lineHeight: 1.3, width: '100%', textAlign: 'center' }}>
                    {adTitle || 'Your Ad Headline'}
                  </div>
                  {adDescription && (
                    <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4, width: '100%', textAlign: 'center', whiteSpace: 'pre-wrap', marginTop: 4 }}>
                      {adDescription}
                    </div>
                  )}
                </div>

                {/* Badge */}
                <div className="ap-badge" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                <div className="ap-arrow-last"></div>
              </div>
            </div>
          </div>

          {/* Modal Preview — how it looks when tapped */}
          {(adTitle || adDescription) && (
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">How it looks when tapped</label>
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50 dark:bg-slate-800/30 space-y-1">
                <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sponsored</div>
                {adDescription && (
                  <p style={{ fontSize: 14, color: '#64748b', whiteSpace: 'pre-wrap', margin: 0 }}>{adDescription}</p>
                )}
                <div style={{ background: '#f8fafc', borderRadius: 12, padding: 12, border: '1px solid #e2e8f0', marginTop: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Merchant</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>{merchantProfile?.businessName || 'Your Business Name'}</div>
                </div>
              </div>
            </div>
          )}

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
                    className="absolute -top-2 -right-2 p-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full transition-colors shadow-md btn-press"
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
                className="flex-1 py-3 border border-slate-200 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-black rounded-xl transition-all btn-press"
              >
                Cancel Edit
              </button>
            )}
            <button
              type="submit"
              disabled={submittingAd}
              className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-slate-950 text-sm font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2 btn-press"
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

                    return (
                      <>
                      <tr key={ad.id} className={`transition-colors ${successAdId === ad.id ? 'bg-emerald-50/80 dark:bg-emerald-900/20 ring-2 ring-emerald-300 dark:ring-emerald-700' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'}`}>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-800 dark:text-white">{ad.title}</td>
                        <td className="px-6 py-4 text-sm capitalize">{ad.package}</td>
                        <td className="px-6 py-4 text-sm">
                          <AdStepper ad={ad} />
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
                              if (pending) return <span className="inline-flex items-center text-amber-600 dark:text-amber-400 font-bold text-xs">⏳ Payment Verification Pending</span>;
                              return (
                              <button
                                    onClick={() => handleRequestAdPayment(ad.id)}
                                    disabled={payingAdId === ad.id && !adPaymentId}
                                    className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50 btn-press"
                                  >
                                    {payingAdId === ad.id && !adPaymentId && <span className="w-3 h-3 border-2 border-white border-t-transparent animate-spin rounded-full" />}
                                    Pay Now
                                  </button>
                                );
                            })()}
                            {ad.status === 'live' && <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-bold text-xs">🟢 Live</span>}
                            {ad.status === 'paused' && <span className="inline-flex items-center text-amber-600 dark:text-amber-400 font-bold text-xs">⏸ Paused</span>}
                            {ad.payments?.some(p => p.status === 'pending' && new Date(p.paidAt) < new Date(Date.now() - 3*24*60*60*1000)) && (
                              <Badge type="pending" size="sm">Verification Pending</Badge>
                            )}
                            {ad.status === 'pending' && (
                              <div className="flex items-center gap-2.5">
                                <button onClick={() => handleEditAd(ad)} className="text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 font-bold text-xs hover:underline btn-press">Edit</button>
                                <span className="text-slate-300 dark:text-slate-700">|</span>
                                <button onClick={() => handleDeleteAd(ad.id)} className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 font-bold text-xs hover:underline btn-press">Delete</button>
                              </div>
                            )}
                            {ad.status === 'rejected' && (
                              <button onClick={() => handleDeleteAd(ad.id)} className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 font-bold text-xs hover:underline btn-press">Delete</button>
                            )}
                           {ad.status === 'expired' && (
                             <button onClick={() => handleRepostAd(ad)} className="px-2.5 py-1 text-xs font-bold text-cyan-600 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/30 dark:text-cyan-400 dark:hover:bg-cyan-900/30 border border-cyan-200/50 dark:border-cyan-900/50 rounded-lg transition-colors btn-press">Repost</button>
                           )}
                           {ad.status === 'paused' && (
                             <span className="text-xs text-slate-400 dark:text-slate-500 italic">Contact admin to resume</span>
                           )}
                        </td>
                      </tr>
                      {ad.status === 'rejected' && (
                        <tr>
                          <td colSpan={7} className="px-6 py-0">
                            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 rounded-2xl p-4 shadow-sm">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
                                  <AlertCircle className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-red-800 dark:text-red-200">Ad Rejected</p>
                                  <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                                    {ad.rejectionReason || 'Contact admin for details.'} Contact admin to resolve and resume.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      </>
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

                return (
                  <div key={ad.id} className={`p-4 space-y-2.5 transition-colors ${successAdId === ad.id ? 'bg-emerald-50/80 dark:bg-emerald-900/20 ring-2 ring-emerald-300 dark:ring-emerald-700 rounded-xl' : ''}`}>
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
                      <AdStepper ad={ad} />
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
                         if (pending) return <span className="inline-flex items-center text-amber-600 dark:text-amber-400 font-bold text-xs">⏳ Payment Verification Pending</span>;
                        return (
                          <button
                            onClick={() => handleRequestAdPayment(ad.id)}
                            disabled={payingAdId === ad.id && !adPaymentId}
                            className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50 btn-press"
                          >
                            {payingAdId === ad.id && !adPaymentId && <span className="w-3 h-3 border-2 border-white border-t-transparent animate-spin rounded-full" />}
                            Pay Now
                          </button>
);
                      })()}
                      {ad.status === 'live' && <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-bold text-xs">🟢 Live</span>}
                      {ad.status === 'paused' && <span className="inline-flex items-center text-amber-600 dark:text-amber-400 font-bold text-xs">⏸ Paused</span>}
                      {ad.payments?.some(p => p.status === 'pending' && new Date(p.paidAt) < new Date(Date.now() - 3*24*60*60*1000)) && (
                        <Badge type="pending" size="sm">Verification Pending</Badge>
                      )}
                      {ad.status === 'pending' && (
                        <>
                          <button onClick={() => handleEditAd(ad)} className="text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 font-bold text-xs btn-press">Edit</button>
                          <button onClick={() => handleDeleteAd(ad.id)} className="text-rose-600 hover:text-rose-700 dark:text-rose-400 font-bold text-xs btn-press">Delete</button>
                        </>
                      )}
                      {ad.status === 'rejected' && (
                        <button onClick={() => handleDeleteAd(ad.id)} className="text-rose-600 hover:text-rose-700 dark:text-rose-400 font-bold text-xs btn-press">Delete</button>
                      )}
                      {ad.status === 'expired' && (
                         <button onClick={() => handleRepostAd(ad)} className="px-2.5 py-1 text-xs font-bold text-cyan-600 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/30 dark:text-cyan-400 border border-cyan-200/50 dark:border-cyan-900/50 rounded-lg transition-colors btn-press">Repost</button>
                       )}
                       {ad.status === 'paused' && (
                         <span className="text-xs text-slate-400 dark:text-slate-500 italic">Contact admin to resume</span>
                       )}
                    </div>
                    {ad.status === 'rejected' && (
                      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
                            <AlertCircle className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-red-800 dark:text-red-200">Ad Rejected</p>
                            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                              {ad.rejectionReason || 'Contact admin for details.'} Contact admin to resolve and resume.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
               })
              ) : (
                <div className="px-6 py-12 text-center text-sm text-slate-400">You have not submitted any advertisements yet.</div>
              )}
               </div>
        </div>

      {/* Ad Payment Modal */}
      <Modal isOpen={!!(payingAdId && adPaymentId)} onClose={handleCloseAdPaymentModal} title="Complete Your Payment">
        <div className="space-y-4 text-center">
          <p className="text-xs text-slate-400">Scan QR code or use UPI ID to pay, then upload payment screenshot.</p>

          <div className="bg-white border border-slate-200 rounded-xl p-5 text-center space-y-3">
            <p className="text-xs font-medium text-slate-500">Scan & pay using any UPI app</p>
            <img
              src={gpayQR}
              alt="GPay QR Code"
              className="w-44 h-44 mx-auto rounded-lg border border-slate-200 object-contain"
            />
            <p className="text-xs text-slate-400">Scan QR code to pay ₹{adPaymentAmount.toLocaleString('en-IN')}</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-2 text-left">
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
                onClick={() => {
                  navigator.clipboard.writeText(adPaymentUpiId);
                  setUpiCopied(true);
                  setTimeout(() => setUpiCopied(false), 2000);
                }}
                className={`mt-2 px-3 py-1.5 border rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  upiCopied
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 scale-105'
                    : 'bg-white dark:bg-dark-card border-slate-200 dark:border-dark-border text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                } btn-press`}
              >
                {upiCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {upiCopied ? 'Copied!' : 'Copy UPI ID'}
              </button>
            )}
          </div>

          <form ref={adPaymentUploadRef} onSubmit={handleUploadAdPaymentScreenshot} className="space-y-4 text-left">
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
                onClick={handleCloseAdPaymentModal}
                className="px-4 py-2 border border-slate-200 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition-all btn-press"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!adScreenshot || adPaymentSubmitting}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 btn-press"
              >
                {adPaymentSubmitting && <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" />}
                Submit Payment Proof
              </button>
            </div>
          </form>
        </div>
      </Modal>
      </div>
      </div>
    </div>
  );
}
