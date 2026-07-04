import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

const colorVariants = {
  primary: {
    iconBg: 'bg-primary/10 dark:bg-primary/20',
    iconText: 'text-primary',
  },
  success: {
    iconBg: 'bg-success/10 dark:bg-success/20',
    iconText: 'text-success',
  },
  warning: {
    iconBg: 'bg-warning/10 dark:bg-warning/20',
    iconText: 'text-warning',
  },
  danger: {
    iconBg: 'bg-danger/10 dark:bg-danger/20',
    iconText: 'text-danger',
  },
  info: {
    iconBg: 'bg-info/10 dark:bg-info/20',
    iconText: 'text-info',
  },
};

export default function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  color = 'primary',
  loading = false,
  compact = false,
}) {
  if (loading) {
    return (
      <div className="ui-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="skeleton w-12 h-12 rounded-xl" />
          <div className="skeleton w-16 h-6 rounded-full" />
        </div>
        <div className="space-y-2">
          <div className="skeleton h-4 w-2/3" />
          <div className="skeleton h-7 w-1/2" />
        </div>
      </div>
    );
  }

  const variant = colorVariants[color] || colorVariants.primary;

  return (
    <div className={`ui-card-hover ${compact ? 'p-4' : 'p-6'} group`}>
      <div className="flex items-center justify-between">
        <div className={`${compact ? 'p-2' : 'p-3'} ${variant.iconBg} rounded-xl ${variant.iconText} transition-transform group-hover:scale-105`}>
          {Icon && <Icon className={compact ? 'w-5 h-5' : 'w-6 h-6'} />}
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
              trend.type === 'up'
                ? 'bg-success/10 text-success dark:bg-success/20 dark:text-success-light'
                : trend.type === 'down'
                  ? 'bg-danger/10 text-danger dark:bg-danger/20 dark:text-danger-light'
                  : 'bg-surface-secondary dark:bg-slate-800 text-text-tertiary dark:text-slate-500'
            }`}
          >
            {trend.type === 'up' ? (
              <ArrowUpRight className="w-3.5 h-3.5" />
            ) : trend.type === 'down' ? (
              <ArrowDownRight className="w-3.5 h-3.5" />
            ) : (
              <Minus className="w-3.5 h-3.5" />
            )}
            {trend.value}
          </div>
        )}
      </div>
      <div className={compact ? 'mt-3' : 'mt-4'}>
        <h3 className="text-text-tertiary dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">{label}</h3>
        <p className={`${compact ? 'text-xl' : 'text-2xl'} font-bold mt-1 text-text-primary dark:text-white`}>{value}</p>
      </div>
    </div>
  );
}
