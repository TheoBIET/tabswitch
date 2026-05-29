import { cn } from '@/lib/utils';

/**
 * TabSwitch brand mark — two stacked rounded "tabs" suggesting switching.
 * Pure SVG (no emoji) so it scales cleanly and inherits the brand gradient.
 */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  const gradId = 'tabswitch-logo-grad';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--color-primary-500)" />
          <stop offset="1" stopColor="var(--color-accent-500)" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="13" height="13" rx="4" fill={`url(#${gradId})`} opacity="0.4" />
      <rect x="8" y="8" width="13" height="13" rx="4" fill={`url(#${gradId})`} />
    </svg>
  );
}

export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark size={size} />
      <span className="font-display text-lg font-extrabold tracking-tight">TabSwitch</span>
    </span>
  );
}
