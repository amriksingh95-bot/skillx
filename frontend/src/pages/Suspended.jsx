import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertOctagon, Mail, Home, RefreshCw } from 'lucide-react';

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
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const config = STATUS_CONFIG[code] || DEFAULT_CONFIG;

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
          {config.showRefresh ? (
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-500/20 hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Status
            </button>
          ) : (
            <a
              href="mailto:support@skillxt.com?subject=Merchant Account Status Inquiry"
              className="w-full py-3 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-rose-500/20 hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Contact Support
            </a>
          )}
          <button
            onClick={() => window.location.href = '/login'}
            className="w-full py-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 btn-press"
          >
            <Home className="w-4 h-4" />
            Go to Login
          </button>
        </div>
      </div>
    </div>
  );
}
