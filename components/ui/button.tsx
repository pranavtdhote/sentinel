import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xs text-xs font-medium transition-editorial focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink-primary disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-amber-accent text-ink-primary hover:bg-amber-hover shadow-pleurat-button',
        destructive: 'bg-danger text-white hover:bg-red-700',
        outline: 'border border-surface-border bg-canvas hover:bg-surface-subtle text-ink-primary',
        secondary: 'bg-surface-strong text-ink-primary hover:bg-surface-subtle border border-surface-border',
        ghost: 'hover:bg-surface-subtle text-ink-primary',
        link: 'text-amber-700 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-[11px]',
        lg: 'h-10 px-6 text-sm',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
