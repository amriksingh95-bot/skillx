import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Store,
  Users,
  History,
  BarChart3,
  Settings,
  ShieldAlert,
  PlusCircle,
  Gift,
  Award,
  MapPin,
  User,
  UserCheck,
  MessageSquare,
  Megaphone,
  CreditCard,
  Activity,
  ChevronDown,
  ChevronRight,
  Wallet,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const adminSections = [
  {
    label: 'Overview',
    links: [
      { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ]
  },
  {
    label: 'Management',
    links: [
      { path: '/admin/merchants', label: 'Merchants', icon: Store },
      { path: '/admin/merchants?tab=pending', label: 'Pending Merchants', icon: UserCheck },
      { path: '/admin/topup-requests', label: 'Top-Up Requests', icon: Wallet },
      { path: '/admin/ad-payments', label: 'Ad Payments', icon: CreditCard },
      { path: '/admin/customers', label: 'Customers', icon: Users },
      { path: '/admin/transactions', label: 'Transactions', icon: History },
      { path: '/admin/complaints', label: 'Complaints', icon: MessageSquare },
      { path: '/admin/advertisements', label: 'Advertisements', icon: Megaphone },
    ]
  },
  {
    label: 'Finance',
    links: [
      { path: '/admin/reward-settings', label: 'Reward Settings', icon: Settings },
      { path: '/admin/reports', label: 'Reports', icon: BarChart3 },
      { path: '/admin/subscription-plans', label: 'Subscription Plans', icon: CreditCard },
      { path: '/admin/merchant-subscriptions', label: 'Merchant Subs', icon: CreditCard },
    ]
  },
  {
    label: 'Analytics',
    links: [
      { path: '/admin/inactivity-monitor', label: 'Inactivity Monitor', icon: Activity },
      { path: '/admin/audit-logs', label: 'Audit Logs', icon: ShieldAlert },
      { path: '/admin/chatbot-analytics', label: 'Chatbot Analytics', icon: MessageSquare },
    ]
  },
];

const merchantLinks = [
  { path: '/merchant/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/merchant/profile', label: 'My Profile', icon: User },
  { path: '/merchant/add-points', label: 'Add Points', icon: PlusCircle },
  { path: '/merchant/redeem-points', label: 'Redeem Points', icon: Gift },
  { path: '/merchant/transactions', label: 'Transactions', icon: History },
  { path: '/merchant/reports', label: 'Reports', icon: BarChart3 },
  { path: '/merchant/subscription', label: 'Subscription', icon: CreditCard },
  { path: '/merchant/topup', label: 'Top Up Points', icon: Wallet },
  { path: '/merchant/promote', label: 'Promote Business', icon: Megaphone },
];

const customerLinks = [
  { path: '/customer/dashboard', label: 'My Wallet', icon: Wallet },
  { path: '/customer/partners', label: 'Find Partners', icon: MapPin },
  { path: '/customer/profile', label: 'My Profile', icon: User },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const [collapsedSections, setCollapsedSections] = useState({});
  const location = useLocation();

  if (!user) return null;

  const toggleSection = (label) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const renderNavLink = (link) => {
    const hashIndex = link.path.indexOf('#');
    const isHashLink = hashIndex !== -1;

    if (isHashLink) {
      const basePath = link.path.substring(0, hashIndex);
      const hash = link.path.substring(hashIndex);
      const isAlreadyOnPage = location.pathname === basePath;

      if (isAlreadyOnPage) {
        return (
          <a
            key={link.path}
            href={link.path}
            onClick={(e) => {
              e.preventDefault();
              onClose();
              const el = document.getElementById(hash.substring(1));
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 bg-primary text-white shadow-sm shadow-primary/20"
          >
            <link.icon className="w-[18px] h-[18px] shrink-0" />
            <span className="truncate">{link.label}</span>
          </a>
        );
      }

      return (
        <NavLink
          key={link.path}
          to={link.path}
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              isActive
                ? 'bg-primary text-white shadow-sm shadow-primary/20'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
            }`
          }
        >
          <link.icon className="w-[18px] h-[18px] shrink-0" />
          <span className="truncate">{link.label}</span>
        </NavLink>
      );
    }

    return (
      <NavLink
        key={link.path}
        to={link.path}
        onClick={onClose}
        className={({ isActive }) =>
          `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
            isActive
              ? 'bg-primary text-white shadow-sm shadow-primary/20'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
          }`
        }
      >
        <link.icon className="w-[18px] h-[18px] shrink-0" />
        <span className="truncate">{link.label}</span>
      </NavLink>
    );
  };

  const renderAdminNav = () => (
    <div className="space-y-4">
      {adminSections.map((section) => {
        const isCollapsed = collapsedSections[section.label];
        return (
          <div key={section.label}>
            <button
              onClick={() => toggleSection(section.label)}
              className="w-full flex items-center justify-between px-4 py-1.5 text-2xs font-bold uppercase tracking-wider text-text-tertiary dark:text-slate-500 hover:text-text-secondary dark:hover:text-slate-400 transition-colors btn-press"
            >
              {section.label}
              {isCollapsed ? (
                <ChevronRight className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
            {!isCollapsed && (
              <div className="mt-1 space-y-0.5">
                {section.links.map(renderNavLink)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderMerchantNav = () => (
    <div className="space-y-0.5">
      {merchantLinks.map(renderNavLink)}
    </div>
  );

  const renderCustomerNav = () => (
    <div className="space-y-0.5">
      {customerLinks.map(renderNavLink)}
    </div>
  );

  const navContent = (() => {
    switch (user.role) {
      case 'super_admin': return renderAdminNav();
      case 'merchant': return renderMerchantNav();
      case 'customer': return renderCustomerNav();
      default: return null;
    }
  })();

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-dark-card border-r border-border dark:border-dark-border w-64 text-text-primary dark:text-slate-100">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border dark:border-dark-border">
        <div className="p-2 bg-primary text-white rounded-xl">
          <Award className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-base leading-none tracking-tight">SkillXT</h1>
          <span className="text-2xs uppercase font-bold text-text-tertiary dark:text-slate-500 tracking-wider">Rewards Platform</span>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 py-5 overflow-y-auto" role="navigation" aria-label={`${user.role} navigation`}>
        {navContent}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-border dark:border-dark-border">
        <div className="flex items-center gap-3 px-3 py-2 text-xs text-text-tertiary dark:text-slate-500">
          <HelpCircle className="w-4 h-4 shrink-0" />
          <span className="truncate">SkillXT v1.0</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block h-screen sticky top-0 z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-text-primary/60 dark:bg-slate-950/80 backdrop-blur-sm transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Mobile navigation"
      >
        {sidebarContent}
      </aside>
    </>
  );
}
