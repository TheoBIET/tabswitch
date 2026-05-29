'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'flex h-12 w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2 text-base shadow-inner',
          'placeholder:text-[color:var(--color-fg-dim)]',
          'focus:border-[color:var(--color-primary-500)]/50 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary-500)]/40',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';
