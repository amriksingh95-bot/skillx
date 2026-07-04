import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertOctagon, Mail, Home } from 'lucide-react';

export default function Suspended() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');

  const isDeactivated = code === 'ACCOUNT_DEACTIVATED';

  const title = isDeactivated ? 'Account Permanently Deactivated' : 'Account Suspended';
  const description = isDeactivated
    ? 'Your account has been permanently deactivated. Please contact support if you believe this is a mistake.'
    : 'Your account has been temporarily suspended. Please contact support to resolve this issue.';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 text-center">
      <div className="max-w-md w-full bg-slate-800/80 backdrop-blur-md p-8 rounded-3xl border border-slate-700 shadow-2xl space-y-6 transform hover:scale-[1.01] transition-transform duration-300">
        <div className="flex justify-center">
          <div className={`p-4 rounded-2xl ${isDeactivated ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'} animate-bounce`}>
            <AlertOctagon className="w-12 h-12" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white tracking-tight">{title}</h2>
          <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
        </div>

        <div className="pt-4 flex flex-col gap-3">
          <a
            href="mailto:support@skillxt.com?subject=Merchant Account Status Inquiry"
            className="w-full py-3 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-rose-500/20 hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
          >
            <Mail className="w-4 h-4" />
            Contact Support
          </a>
          <button
            onClick={() => window.location.href = '/login'}
            className="w-full py-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Go to Login
          </button>
        </div>
      </div>
    </div>
  );
}
