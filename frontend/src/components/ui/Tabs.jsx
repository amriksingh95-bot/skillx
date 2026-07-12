import React, { useState, useCallback } from 'react';

export function Tabs({ children, defaultTab, onChange, className = '' }) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    onChange?.(tab);
  }, [onChange]);

  return (
    <div className={className}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            activeTab,
            onTabChange: handleTabChange,
          });
        }
        return child;
      })}
    </div>
  );
}

export function TabList({ children, activeTab, onTabChange, className = '' }) {
  return (
    <div
      className={`flex items-center gap-1 border-b border-border dark:border-dark-border ${className}`}
      role="tablist"
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            isActive: child.props.value === activeTab,
            onClick: () => onTabChange(child.props.value),
          });
        }
        return child;
      })}
    </div>
  );
}

export function Tab({ value, label, icon: Icon, isActive, onClick, badge, className = '' }) {
  return (
    <button
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all duration-200 border-b-2 -mb-px ${
        isActive
          ? 'text-primary border-primary bg-primary/5 dark:bg-primary/10'
          : 'text-text-tertiary dark:text-slate-500 border-transparent hover:text-text-secondary dark:hover:text-slate-300 hover:border-border-strong dark:hover:border-slate-600'
      } ${className} btn-press`}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {label}
      {badge !== undefined && (
        <span className={`text-2xs font-bold px-1.5 py-0.5 rounded-full ${
          isActive
            ? 'bg-primary/10 text-primary'
            : 'bg-slate-100 dark:bg-slate-800 text-text-tertiary dark:text-slate-500'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

export function TabPanel({ value, activeTab, children, className = '' }) {
  if (value !== activeTab) return null;

  return (
    <div
      role="tabpanel"
      className={`animate-fade-in ${className}`}
    >
      {children}
    </div>
  );
}

export default Tabs;
