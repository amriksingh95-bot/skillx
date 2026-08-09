import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';
import Modal from '../components/Modal';
import { AlertOctagon, Mail, Home, RefreshCw, Upload, MessageSquare, X, Camera } from 'lucide-react';
import gpayQR from '../assets/gpay-qr.png';
import imageCompression from 'browser-image-compression';

const STATUS_CONFIG = {
  ACCOUNT_SUSPENDED: {
    title: 'Account Suspended',
    description: 'Your account has been temporarily suspended. Please contact support to resolve this issue.',
    iconBg: 'bg-amber-500/10 text-amber-500',
    showRefresh: false
  },
  ACCOUNT_DEACTIVATED: {
    title: 'Account Permanently Deactivated',
    description: 'Your account has been permanently deactivated. Please contact support if you believe this is a mistake.',
    iconBg: 'bg-rose-500/10 text-rose-500',
    showRefresh: false
  },
  ACCOUNT_PENDING: {
    title: 'Application Under Review',
    description: 'Your application is pending admin review. You will be notified once approved.',
    iconBg: 'bg-amber-500/10 text-amber-500',
    showRefresh: true
  },
  PAYMENT_REQUIRED: {
    title: 'Payment Required',
    description: 'Your application is approved. Please login and complete subscription payment of \u20B9399 to activate your account.',
    iconBg: 'bg-amber-500/10 text-amber-500',
    showRefresh: true
  },
  PAYMENT_UNDER_VERIFICATION: {
    title: 'Payment Under Verification',
    description: 'Your payment screenshot has been received. Admin is verifying your payment.',
    iconBg: 'bg-amber-500/10 text-amber-500',
    showRefresh: true
  }
};

const DEFAULT_CONFIG = {
  title: 'Account Status',
  description: 'There is an issue with your account. Please contact support to resolve this.',
  iconBg: 'bg-amber-500/10 text-amber-500',
  showRefresh: false
};

export default function Suspended() {
  const [searchParams, setSearchParams] = useSearchParams();
  const code = searchParams.get('code');
  const config = STATUS_CONFIG[code] || DEFAULT_CONFIG;
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [screenshotFileKey, setScreenshotFileKey] = useState(Date.now());

  useEffect(() => {
    if (code === 'PAYMENT_REQUIRED') {
      api.get('/api/merchant/subscription')
        .then((res) => setUpiId(res.data.data?.upiId || ''))
        .catch(() => {});
    }
  }, [code]);

  const handleScreenshotUpload = async (e) => {
    e.preventDefault();
    if (!screenshotFile) return;

    setIsUploading(true);
    try {
      let fileToUpload = screenshotFile;
      if (screenshotFile.type !== 'application/pdf') {
        fileToUpload = await imageCompression(screenshotFile, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
        });
      }
      const formData = new FormData();
      formData.append('screenshot', fileToUpload);

      await api.post('/api/merchant/subscription/upload-screenshot', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Screenshot uploaded! Admin will verify within 24 hours.');
      setIsPaymentModalOpen(false);
      setScreenshotFile(null);
      setSearchParams({ code: 'PAYMENT_UNDER_VERIFICATION' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload screenshot.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleGoToLogin = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 text-center">
      <div className="max-w-md w-full bg-slate-800/80 backdrop-blur-md p-8 rounded-3xl border border-slate-700 shadow-2xl space-y-6 transform hover:scale-[1.01] transition-transform duration-300">
        <div className="flex justify-center">
          <div className={`p-4 rounded-2xl ${config.iconBg} animate-bounce`}>
            <AlertOctagon className="w-12 h-12" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white tracking-tight">{config.title}</h2>
          <p className="text-sm text-slate-400 leading-relaxed">{config.description}</p>
        </div>

        <div className="pt-4 flex flex-col gap-3">
          {code === 'PAYMENT_REQUIRED' && (
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-500/20 hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Pay ₹399 Now
            </button>
          )}
          {code !== 'PAYMENT_REQUIRED' && config.showRefresh ? (
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-500/20 hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Status
            </button>
          ) : (
            <>
              <a
                href="https://wa.me/917508009001?text=Hi%2C%20I%20need%20help%20with%20my%20SkillXT%20merchant%20account"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Chat on WhatsApp
              </a>
              <a
                href="mailto:operations.skillxt@gmail.com"
                className="w-full py-2.5 border border-slate-600 hover:border-slate-500 text-slate-400 hover:text-slate-300 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Mail className="w-3.5 h-3.5" />
                Email us
              </a>
            </>
          )}
          <button
            onClick={handleGoToLogin}
            className="w-full py-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 btn-press"
          >
            <Home className="w-4 h-4" />
            Go to Login
          </button>
        </div>
      </div>

      <Toaster position="top-center" />

      {code === 'PAYMENT_REQUIRED' && (
        <Modal isOpen={isPaymentModalOpen} onClose={() => { setIsPaymentModalOpen(false); setScreenshotFile(null); }} title="Pay ₹399 via GPay / UPI">
          <form onSubmit={handleScreenshotUpload} className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center space-y-3">
              <p className="text-xs font-medium text-slate-500">Scan & pay using any UPI app</p>
              <img
                src={gpayQR}
                alt="GPay QR Code"
                className="w-44 h-44 mx-auto rounded-lg border border-slate-200 object-contain"
              />
              {upiId && (
                <a
                  href={`upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent('Amrik Singh')}&am=${399}&cu=INR&tn=${encodeURIComponent('SkillXT Subscription ' + (user?.id || ''))}`}
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold shadow-sm transition-all btn-press"
                >
                  Pay now
                </a>
              )}
              <div className="bg-slate-50 rounded-lg px-4 py-2 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">UPI ID</span>
                  <span className="text-sm font-bold text-slate-800 select-all cursor-text">{upiId || 'Loading...'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Amount</span>
                  <span className="text-sm font-bold text-emerald-600">₹399</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Upload Payment Screenshot
              </label>
              <input
                key={screenshotFileKey}
                type="file"
                accept="image/*"
                onChange={(e) => setScreenshotFile(e.target.files[0])}
                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
              {screenshotFile && (
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <span className="flex-1 truncate">{screenshotFile.name}</span>
                  <button
                    type="button"
                    onClick={() => { setScreenshotFile(null); setScreenshotFileKey(Date.now()); }}
                    className="p-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full transition-colors shadow-sm btn-press"
                    title="Remove file"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <input
                key={`cam-${screenshotFileKey}`}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setScreenshotFile(e.target.files[0])}
                className="hidden"
                id="suspended-camera-input"
              />
              <button
                type="button"
                onClick={() => document.getElementById('suspended-camera-input').click()}
                className="mt-2 w-full py-2 border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 btn-press"
              >
                <Camera className="w-3.5 h-3.5" />
                Take Photo
              </button>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setIsPaymentModalOpen(false); setScreenshotFile(null); }}
                className="flex-1 py-2.5 border border-slate-200 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all btn-press"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!screenshotFile || isUploading}
                className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 btn-press"
              >
                {isUploading ? <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" /> : <Upload className="w-4 h-4" />}
                Upload & Submit
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
