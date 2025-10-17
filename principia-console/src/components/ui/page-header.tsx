import React from 'react';
import clsx from 'clsx';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  size?: 'xl' | 'lg' | 'md' | 'sm';
  /** Render description in smaller subdued style */
  subtleDescription?: boolean;
  /** Remove bottom margin for tight stacking */
  compact?: boolean;
  className?: string;
}

// Map size to semantic heading tag + class (keeping left alignment + truncation)
const sizeMap: Record<NonNullable<PageHeaderProps['size']>, { tag: React.ElementType; className: string }> = {
  xl: { tag: 'h1', className: 'h1' },
  lg: { tag: 'h1', className: 'h2' },
  md: { tag: 'h2', className: 'h3' },
  sm: { tag: 'h3', className: 'h4' },
};

export function PageHeader({
  title,
  description,
  actions,
  size = 'lg',
  subtleDescription = true,
  compact,
  className,
}: PageHeaderProps) {
  const { tag: TitleTag, className: titleClass } = sizeMap[size];
  return (
    <header
      className={clsx(
        'w-full flex flex-col gap-2',
        compact ? 'mb-2' : 'mb-6',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <TitleTag className={clsx(titleClass, 'truncate')}>
            {title}
          </TitleTag>
          {description && (
            <p
              className={clsx(
                'max-w-3xl',
                subtleDescription
                  ? 'text-xs text-muted-foreground leading-relaxed'
                  : 'text-sm text-muted-foreground leading-relaxed'
              )}
            >
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}

export default PageHeader;