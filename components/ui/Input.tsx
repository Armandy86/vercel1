'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, style, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{label}</label>
        )}
        <div style={{ position: 'relative' }}>
          {icon && (
            <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>{icon}</div>
          )}
          <input
            ref={ref}
            className="fp-input"
            style={{ ...(icon ? { paddingLeft: 34 } : {}), ...(error ? { borderColor: '#f87171' } : {}), ...style }}
            {...props}
          />
        </div>
        {error && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 2 }}>{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, children, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{label}</label>
        )}
        <select ref={ref} className="fp-select" {...props}>{children}</select>
        {error && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 2 }}>{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{label}</label>
        )}
        <textarea ref={ref} className="fp-textarea" rows={3} {...props} />
        {error && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 2 }}>{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
