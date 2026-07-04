import React, { forwardRef } from 'react';

const FormTextarea = forwardRef(({
  label,
  error,
  helperText,
  required = false,
  disabled = false,
  rows = 4,
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
      <textarea
        ref={ref}
        disabled={disabled}
        rows={rows}
        className={`ui-input resize-none ${error ? 'ui-input-error' : ''} ${disabled ? 'ui-input-disabled' : ''} ${className}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined}
        {...props}
      />
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

FormTextarea.displayName = 'FormTextarea';

export default FormTextarea;
