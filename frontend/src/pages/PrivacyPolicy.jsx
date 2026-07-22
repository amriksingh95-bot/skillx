import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function PrivacyPolicy() {
  const { isAuthenticated, user } = useAuth();

  const backLink = (() => {
    if (!isAuthenticated || !user) {
      return { to: '/login', label: 'Back to Login' };
    }
    switch (user.role) {
      case 'super_admin':
        return { to: '/admin/dashboard', label: 'Back to Dashboard' };
      case 'merchant':
        return { to: '/merchant/dashboard', label: 'Back to Dashboard' };
      case 'customer':
        return { to: '/customer/dashboard', label: 'Back to Dashboard' };
      default:
        return { to: '/login', label: 'Back to Login' };
    }
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <Link
          to={backLink.to}
          className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {backLink.label}
        </Link>

        <div className="bg-white dark:bg-slate-800/80 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl p-8 md:p-12 space-y-8">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
              Privacy Policy
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Last updated: [date]
            </p>
          </div>

          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            SkillXT Rewards ("we", "us") is a loyalty rewards platform connecting customers and merchants. This policy explains what personal information we collect and how we handle it.
          </p>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              What we collect
            </h2>
            <ul className="space-y-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              <li className="flex gap-2">
                <span className="text-primary mt-1 shrink-0">&#8226;</span>
                <span>Contact details: name, mobile number, email address</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-1 shrink-0">&#8226;</span>
                <span>Profile details: date of birth, anniversary date, gender, address, city, occupation, and similar profile information you choose to share</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-1 shrink-0">&#8226;</span>
                <span>Transaction data: purchases, points earned and redeemed, at participating merchants</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-1 shrink-0">&#8226;</span>
                <span>For merchants: business name, owner name, business address, payment screenshots for subscriptions</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-1 shrink-0">&#8226;</span>
                <span>Technical data: device and login information needed to keep your account secure</span>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              How we use it
            </h2>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              We use this information to run your account, calculate and apply reward points, process merchant payments and subscriptions, send you relevant notifications, and improve the app.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              How long we keep it
            </h2>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              We retain your data as long as your account is active. If you'd like your data removed, see below.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Your right to delete your data
            </h2>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              You can request deletion of your personal data at any time by emailing{' '}
              <a
                href="mailto:operations.skillxt@gmail.com"
                className="text-primary hover:underline font-medium"
              >
                operations.skillxt@gmail.com
              </a>{' '}
              with your registered mobile number. We will process your request within 30 days. Some transaction records may be retained in anonymized form for accounting and legal purposes.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Third parties we share data with
            </h2>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              We use trusted service providers to operate the app, including SMS/email delivery for OTP verification, cloud storage for payment screenshots, and messaging alerts for account notifications.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Contact us
            </h2>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              For any privacy questions or concerns, email us at{' '}
              <a
                href="mailto:operations.skillxt@gmail.com"
                className="text-primary hover:underline font-medium"
              >
                operations.skillxt@gmail.com
              </a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
