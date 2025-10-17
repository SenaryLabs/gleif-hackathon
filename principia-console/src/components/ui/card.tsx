import * as React from 'react';
import clsx from 'clsx';

type Size = 'sm' | 'md' | 'lg';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: Size;
  muted?: boolean;
  /** Remove border/shadow for minimalist inline grouping */
  bare?: boolean;
  /** Apply globally denser font sizing within card (adds .text-2xs where appropriate) */
  dense?: boolean;
}

const sizeMap: Record<Size, string> = {
  sm: 'card-sm',
  md: 'card-md',
  lg: 'card-lg'
};

export const Card = ({ className, size = 'md', muted, bare, dense, ...rest }: CardProps) => (
  <div
    className={clsx(
      'card',
      sizeMap[size],
      muted && 'card-muted',
      bare && 'card-bare',
      dense && 'card-dense',
      className
    )}
    {...rest}
  />
);

interface SectionProps extends React.HTMLAttributes<HTMLDivElement> {
  compact?: boolean;
  dense?: boolean;
}

export const CardHeader = ({ className, compact, dense, ...rest }: SectionProps) => (
  <div
    className={clsx(
      'card-header',
      compact && 'card-header-compact',
      'typography-tight',
      dense && 'text-2xs leading-tight',
      className
    )}
    {...rest}
  />
);

export const CardBody = ({ className, compact, dense, ...rest }: SectionProps) => (
  <div
    className={clsx(
      'card-body',
      compact && 'card-body-compact',
      dense ? 'text-2xs leading-tight space-y-1.5' : 'text-xs leading-[1.32] space-y-2',
      className
    )}
    {...rest}
  />
);

