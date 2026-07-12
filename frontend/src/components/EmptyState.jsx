import React from 'react';
import { Database } from 'lucide-react';

export default function EmptyState({
  title = 'No data available',
  description = 'There are no records matching your criteria.',
  icon: Icon = Database,
  action,
  actionLabel,
  onAction,
  illustration,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 md:p-12 text-center ${className}`}>
      {illustration ? (
        <div className="mb-6">{illustration}</div>
      ) : (
        <div className="p-5 bg-surface-secondary dark:bg-slate-800 rounded-2xl text-text-tertiary dark:text-slate-500 mb-5">
          <Icon className="w-10 h-10" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-1.5">{title}</h3>
      <p className="text-sm text-text-secondary dark:text-slate-400 max-w-sm mb-6 leading-relaxed">{description}</p>
      {(action || onAction) && (
        <button
          onClick={onAction || action}
          className="ui-btn-primary btn-press"
        >
          {actionLabel || 'Get Started'}
        </button>
      )}
    </div>
  );
}
