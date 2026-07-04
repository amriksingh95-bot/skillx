import React from 'react';

function Skeleton({ className = '', variant = 'rect', ...props }) {
  const baseClass = 'skeleton';

  const variants = {
    rect: 'rounded',
    circle: 'rounded-full',
    text: 'rounded h-4',
    heading: 'rounded h-6',
    card: 'rounded-2xl',
  };

  return (
    <div
      className={`${baseClass} ${variants[variant] || variants.rect} ${className}`}
      {...props}
    />
  );
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`ui-card p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <Skeleton className="w-16 h-6 rounded-full" />
      </div>
      <Skeleton variant="text" className="w-1/2 mb-2" />
      <Skeleton variant="heading" className="w-1/3" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4, className = '' }) {
  return (
    <div className={`ui-card overflow-hidden ${className}`}>
      <div className="px-6 py-4 border-b border-border dark:border-dark-border bg-surface-secondary dark:bg-slate-800/50">
        <div className="flex items-center justify-between">
          <Skeleton variant="text" className="w-48" />
          <Skeleton variant="text" className="w-32" />
        </div>
      </div>
      <div className="divide-y divide-border dark:divide-dark-border">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="px-6 py-4 flex items-center gap-6">
            {Array.from({ length: columns }).map((_, colIdx) => (
              <Skeleton
                key={colIdx}
                variant="text"
                className="flex-1"
                style={{ maxWidth: `${60 + Math.random() * 40}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const gridColClasses = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
  6: 'lg:grid-cols-6',
};

export function SkeletonStats({ count = 4, className = '' }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${gridColClasses[count] || 'lg:grid-cols-4'} gap-6 ${className}`}>
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonCard key={idx} />
      ))}
    </div>
  );
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, idx) => (
        <Skeleton
          key={idx}
          variant="text"
          className="h-4"
          style={{ width: idx === lines - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  );
}

export default Skeleton;
