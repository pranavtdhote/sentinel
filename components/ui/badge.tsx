import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const badgeVariants = cva(
  'inline-flex items-center rounded-xs px-2 py-0.5 font-mono-tech text-[10px] font-semibold transition-colors focus:outline-none focus:ring-1 focus:ring-ink-primary',
  {
    variants: {
      variant: {
        default: 'border border-surface-border bg-surface-strong text-ink-primary',
        amber: 'border border-amber-accent/40 bg-amber-light text-ink-primary font-bold',
        destructive: 'border border-danger-border bg-danger-surface text-danger font-bold',
        success: 'border border-success-border bg-success-surface text-success font-bold',
        outline: 'border border-surface-border text-ink-secondary',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
