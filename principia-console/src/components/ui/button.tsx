import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import clsx from 'clsx';

const buttonVariants = cva(
  'btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'btn-primary',
        outline: 'btn-outline',
        ghost: 'btn-ghost',
      },
      size: {
        sm: 'text-xs py-1.5 px-2.5',
        md: '',
        lg: 'text-base py-3 px-5',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button({ className, variant, size, ...rest }, ref) {
  return <button ref={ref} className={clsx(buttonVariants({ variant, size }), className)} {...rest} />;
});
