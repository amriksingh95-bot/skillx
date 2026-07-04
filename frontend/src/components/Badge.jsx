import React from 'react';

const colorMap = {
  active: 'bg-success/10 text-success dark:bg-success/20 dark:text-success-light border border-success/20 dark:border-success/30',
  completed: 'bg-success/10 text-success dark:bg-success/20 dark:text-success-light border border-success/20 dark:border-success/30',
  inactive: 'bg-surface-secondary text-text-secondary dark:bg-slate-800 dark:text-slate-400 border border-border dark:border-slate-700',
  reversed: 'bg-danger/10 text-danger dark:bg-danger/20 dark:text-danger-light border border-danger/20 dark:border-danger/30',
  voided: 'bg-surface-secondary text-text-secondary dark:bg-slate-800 dark:text-slate-400 border border-border dark:border-slate-700',
  suspended: 'bg-warning/10 text-warning dark:bg-warning/20 dark:text-warning-light border border-warning/20 dark:border-warning/30',
  deactivated: 'bg-danger/10 text-danger dark:bg-danger/20 dark:text-danger-light border border-danger/20 dark:border-danger/30',
  pending: 'bg-warning/10 text-warning dark:bg-warning/20 dark:text-warning-light border border-warning/20 dark:border-warning/30',
  approved: 'bg-success/10 text-success dark:bg-success/20 dark:text-success-light border border-success/20 dark:border-success/30',
  rejected: 'bg-danger/10 text-danger dark:bg-danger/20 dark:text-danger-light border border-danger/20 dark:border-danger/30',
  expired: 'bg-surface-secondary text-text-secondary dark:bg-slate-800 dark:text-slate-400 border border-border dark:border-slate-700',
  live: 'bg-success/10 text-success dark:bg-success/20 dark:text-success-light border border-success/20 dark:border-success/30',
  paused: 'bg-warning/10 text-warning dark:bg-warning/20 dark:text-warning-light border border-warning/20 dark:border-warning/30',
  queued: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light border border-primary/20 dark:border-primary/30',

  earn: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light border border-primary/20 dark:border-primary/30',
  redeem: 'bg-warning/10 text-warning dark:bg-warning/20 dark:text-warning-light border border-warning/20 dark:border-warning/30',
  adjustment: 'bg-info/10 text-info dark:bg-info/20 dark:text-info-light border border-info/20 dark:border-info/30',
  reversal: 'bg-danger/10 text-danger dark:bg-danger/20 dark:text-danger-light border border-danger/20 dark:border-danger/30',

  super_admin: 'bg-info/10 text-info dark:bg-info/20 dark:text-info-light border border-info/20 dark:border-info/30',
  merchant: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light border border-primary/20 dark:border-primary/30',
  customer: 'bg-success/10 text-success dark:bg-success/20 dark:text-success-light border border-success/20 dark:border-success/30',

  grace_period: 'bg-warning/10 text-warning dark:bg-warning/20 dark:text-warning-light border border-warning/20 dark:border-warning/30',
  expired_subscription: 'bg-danger/10 text-danger dark:bg-danger/20 dark:text-danger-light border border-danger/20 dark:border-danger/30',
};

export default function Badge({ type, children, size = 'default', dot = false }) {
  const normalizedType = String(type).toLowerCase().replace(/\s+/g, '_');
  const themeClasses = colorMap[normalizedType] || 'bg-surface-secondary text-text-secondary dark:bg-slate-800 dark:text-slate-400 border border-border dark:border-slate-700';

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-2xs',
    default: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
  };

  return (
    <span className={`ui-badge ${sizeClasses[size] || sizeClasses.default} ${themeClasses} font-semibold tracking-wide capitalize`}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${
          normalizedType === 'active' || normalizedType === 'completed' ? 'bg-success' :
          normalizedType === 'pending' || normalizedType === 'suspended' ? 'bg-warning' :
          normalizedType === 'rejected' || normalizedType === 'reversed' || normalizedType === 'deactivated' ? 'bg-danger' :
          'bg-slate-400 dark:bg-slate-500'
        }`} />
      )}
      {children || type}
    </span>
  );
}
