'use client';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const variantClass: Record<string, string> = {
  default: 'fp-badge fp-badge-default',
  success: 'fp-badge fp-badge-success',
  warning: 'fp-badge fp-badge-warning',
  danger: 'fp-badge fp-badge-danger',
  info: 'fp-badge fp-badge-info',
};

export function Badge({ children, className, variant = 'default' }: BadgeProps) {
  return (
    <span className={`${variantClass[variant]} ${className ?? ''}`}>
      {children}
    </span>
  );
}
