"use client";
import * as React from 'react';
import { Info, CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';
import clsx from 'clsx';

type Variant = 'info' | 'success' | 'warning' | 'destructive';

const ICONS: Record<Variant, React.ReactNode> = {
  info: <Info className="banner-icon" />,
  success: <CheckCircle2 className="banner-icon" />,
  warning: <AlertTriangle className="banner-icon" />,
  destructive: <XCircle className="banner-icon" />,
};

export interface BannerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export function Banner({ variant = 'info', dismissible = false, onDismiss, className, children, ...rest }: BannerProps) {
  return (
    <div className={clsx('banner', `banner-${variant}`, className)} role="status" {...rest}>
      {ICONS[variant]}
      <div className="flex-1 min-w-0">{children}</div>
      {dismissible && (
        <button aria-label="Dismiss" className="banner-close" onClick={onDismiss}>
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export default Banner;
