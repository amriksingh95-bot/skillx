import React, { forwardRef } from 'react';

const FormInput = forwardRef(({
  label,
  error,
  helperText,
  required = false,
  disabled = false,
  icon: Icon,
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
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Icon className="w-4 h-4 text-text-tertiary dark:text-slate-500" />
          </div>
        )}
        <input
          ref={ref}
          disabled={disabled}
          className={`ui-input ${Icon ? 'pl-10' : ''} ${error ? 'ui-input-error' : ''} ${disabled ? 'ui-input-disabled' : ''} ${className}`}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined}
          {...props}
        />
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

FormInput.displayName = 'FormInput';

export default FormInput;
