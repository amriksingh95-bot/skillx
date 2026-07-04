import React from 'react';

export default function LoadingSpinner({ size = 'medium', fullPage = false }) {
  const sizeClasses = {
    small: 'w-5 h-5 border-2',
    medium: 'w-8 h-8 border-3',
    large: 'w-12 h-12 border-4'
  };

  const spinner = (
    <div className={`animate-spin rounded-full border-t-primary border-slate-200 dark:border-slate-700 ${sizeClasses[size] || sizeClasses.medium}`} />
  );

  if (fullPage) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] w-full">
        {spinner}
      </div>
    );
  }

  return <div className="flex items-center justify-center p-4 w-full">{spinner}</div>;
}
