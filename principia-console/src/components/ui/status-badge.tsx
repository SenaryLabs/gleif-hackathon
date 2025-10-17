import * as React from 'react';
import clsx from 'clsx';
import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

export type BadgeVariant = 'success' | 'error' | 'pending' | 'warning' | 'neutral';

const ICON_MAP: Record<BadgeVariant, React.ReactNode> = {
  success: <CheckCircle2 size={12} />,
  error: <XCircle size={12} />,
  pending: <Clock size={12} />,
  warning: <AlertCircle size={12} />,
  neutral: null,
};

const STYLE_MAP: Record<BadgeVariant, string> = {
  success: 'bg-[var(--success-bg)] text-[var(--success)] border-[#B6EBCB]',
  error: 'bg-[var(--destructive-bg)] text-[var(--destructive)] border-[#F5A5AA]',
  pending: 'bg-[var(--warning-bg)] text-[#8A6D00] border-[#FFE29A]',
  warning: 'bg-[var(--warning-bg)] text-[#8A6D00] border-[#FFE29A]',
  neutral: 'bg-[var(--background)] text-[var(--muted-foreground)] border-[var(--border)]',
};

export interface StatusBadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({ variant, children, className }: StatusBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium border rounded',
        STYLE_MAP[variant],
        className
      )}
    >
      {ICON_MAP[variant]}
      {children}
    </span>
  );
}

export default StatusBadge;
