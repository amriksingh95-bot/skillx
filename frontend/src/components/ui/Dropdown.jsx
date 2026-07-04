import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function Dropdown({
  trigger,
  children,
  align = 'left',
  width = 'auto',
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);

  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        close();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') close();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, close]);

  const handleTriggerClick = () => setIsOpen(!isOpen);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  const widthClasses = {
    auto: '',
    sm: 'w-48',
    md: 'w-56',
    lg: 'w-64',
    full: 'w-full',
  };

  const alignClasses = {
    left: 'left-0',
    right: 'right-0',
    'top-left': 'left-0 bottom-full mb-1',
    'top-right': 'right-0 bottom-full mb-1',
  };

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      <div
        ref={triggerRef}
        onClick={handleTriggerClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {trigger}
      </div>

      {isOpen && (
        <div
          className={`absolute z-50 mt-1 ${widthClasses[width] || ''} ${alignClasses[align] || ''} bg-white dark:bg-dark-card border border-border dark:border-dark-border rounded-xl shadow-dropdown overflow-hidden animate-slide-up`}
          role="menu"
        >
          {typeof children === 'function' ? children({ close }) : children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({
  icon: Icon,
  label,
  onClick,
  danger = false,
  disabled = false,
  close,
}) {
  const handleClick = () => {
    if (disabled) return;
    onClick?.();
    close?.();
  };

  return (
    <button
      role="menuitem"
      disabled={disabled}
      onClick={handleClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
        danger
          ? 'text-danger hover:bg-danger/10 dark:hover:bg-danger/20'
          : 'text-text-primary dark:text-slate-200 hover:bg-surface-secondary dark:hover:bg-slate-800'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {Icon && <Icon className={`w-4 h-4 ${danger ? 'text-danger' : 'text-text-tertiary dark:text-slate-500'}`} />}
      {label}
    </button>
  );
}

export function DropdownSeparator() {
  return <div className="ui-divider my-1" />;
}

export function DropdownLabel({ children }) {
  return (
    <div className="px-4 py-2 text-2xs font-bold uppercase tracking-wider text-text-tertiary dark:text-slate-500">
      {children}
    </div>
  );
}

export function DropdownCheckbox({ label, checked, onChange, icon: Icon }) {
  return (
    <button
      role="menuitemcheckbox"
      aria-checked={checked}
      onClick={() => onChange?.(!checked)}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-text-primary dark:text-slate-200 hover:bg-surface-secondary dark:hover:bg-slate-800 transition-colors"
    >
      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
        checked
          ? 'bg-primary border-primary'
          : 'border-border-strong dark:border-slate-600'
      }`}>
        {checked && <Check className="w-3 h-3 text-white" />}
      </div>
      {Icon && <Icon className="w-4 h-4 text-text-tertiary dark:text-slate-500" />}
      {label}
    </button>
  );
}
