'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-[transform,background,box-shadow] duration-200 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary-500)]',
  {
    variants: {
      variant: {
        primary:
          'bg-[color:var(--color-primary-500)] text-white shadow-[var(--shadow-glow)] hover:bg-[color:var(--color-primary-600)]',
        accent:
          'bg-gradient-to-br from-[color:var(--color-primary-500)] to-[color:var(--color-accent-500)] text-white shadow-[var(--shadow-glow)] hover:brightness-110',
        ghost:
          'bg-transparent text-[color:var(--color-fg)] hover:bg-white/5',
        outline:
          'border border-white/10 bg-white/[0.02] text-[color:var(--color-fg)] hover:bg-white/[0.06]',
        danger:
          'bg-[color:var(--color-danger-500)] text-white hover:brightness-110',
        subtle:
          'bg-white/[0.04] text-[color:var(--color-fg)] hover:bg-white/[0.08]',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4',
        lg: 'h-12 px-6 text-base',
        xl: 'h-14 px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
  },
);
Button.displayName = 'Button';

export { buttonVariants };
