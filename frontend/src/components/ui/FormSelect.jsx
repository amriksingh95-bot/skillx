import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

const FormSelect = forwardRef(({
  label,
  error,
  helperText,
  required = false,
  disabled = false,
  options = [],
  placeholder = 'Select an option',
  className = '',
  containerClassName = '',
  ...props
}, ref) => {
  return (
    <div className={containerClassName}>
      {label && (
        <label className="ui-label">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          disabled={disabled}
          className={`ui-input appearance-none pr-10 ${error ? 'ui-input-error' : ''} ${disabled ? 'ui-input-disabled' : ''} ${className}`}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
          <ChevronDown className="w-4 h-4 text-text-tertiary dark:text-slate-500" />
        </div>
      </div>
      {error && (
        <p id={`${props.id}-error`} className="mt-1.5 text-xs text-danger font-medium" role="alert">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={`${props.id}-helper`} className="mt-1.5 text-xs text-text-tertiary dark:text-slate-500">
          {helperText}
        </p>
      )}
    </div>
  );
});

FormSelect.displayName = 'FormSelect';

export default FormSelect;
