'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variantClass: Record<string, string> = {
  primary: 'fp-btn fp-btn-primary',
  secondary: 'fp-btn fp-btn-secondary',
  ghost: 'fp-btn fp-btn-ghost',
  danger: 'fp-btn fp-btn-danger',
};

const sizeStyle: Record<string, React.CSSProperties> = {
  sm: { padding: '6px 14px', fontSize: 13 },
  md: { padding: '9px 18px', fontSize: 14 },
  lg: { padding: '11px 24px', fontSize: 15 },
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, style, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${variantClass[variant] ?? variantClass.primary} ${className ?? ''}`}
        style={{ ...sizeStyle[size], ...style }}
        {...props}
      >
        {loading && (
          <svg style={{ animation: 'spin 1s linear infinite', width: 16, height: 16 }} fill="none" viewBox="0 0 24 24">
            <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
