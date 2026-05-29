import Link from 'next/link';
import { cn } from '@/lib/utils';

export type GameCardProps = {
  href: string;
  title: string;
  tagline: string;
  emoji?: string;
  status: 'live' | 'soon' | 'cta';
  accentFrom: string;
  accentTo: string;
  minPlayers?: number;
  maxPlayers?: number;
  duration?: string;
};

export function GameCard(props: GameCardProps) {
  const { href, title, tagline, emoji, status, accentFrom, accentTo, minPlayers, maxPlayers, duration } = props;
  const isSoon = status === 'soon';

  const inner = (
    <article
      className={cn(
        'group relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-all duration-300',
        !isSoon && 'hover:-translate-y-1 hover:[border-color:var(--card-accent-from)] hover:[box-shadow:0_18px_60px_-12px_var(--card-accent-glow)]',
        isSoon && 'opacity-70',
      )}
      style={{
        ['--card-accent-from' as string]: accentFrom,
        ['--card-accent-to' as string]: accentTo,
        ['--card-accent-glow' as string]: `${accentFrom}66`,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-30 transition-opacity group-hover:opacity-50"
        style={{
          background: `radial-gradient(circle at 30% 0%, ${accentFrom}, transparent 60%), radial-gradient(circle at 80% 100%, ${accentTo}, transparent 50%)`,
        }}
      />

      <div className="flex items-start justify-between">
        <span className="text-3xl">{emoji}</span>
        <Badge status={status} />
      </div>

      <h2 className="font-display mt-1 text-2xl font-extrabold leading-tight">{title}</h2>
      <p className="text-sm text-[color:var(--color-fg-muted)]">{tagline}</p>

      {(minPlayers || maxPlayers || duration) && (
        <div className="mt-auto flex flex-wrap gap-2 pt-2 text-xs text-[color:var(--color-fg-muted)]">
          {minPlayers && maxPlayers && (
            <span className="rounded-full bg-white/5 px-2 py-1">
              {minPlayers}-{maxPlayers} joueurs
            </span>
          )}
          {duration && <span className="rounded-full bg-white/5 px-2 py-1">{duration}</span>}
        </div>
      )}
    </article>
  );

  if (isSoon) {
    return (
      <div className="block cursor-not-allowed" aria-label={`${title} — bientôt disponible`}>
        {inner}
      </div>
    );
  }

  return (
    <Link href={href} className="block focus-visible:rounded-2xl">
      {inner}
    </Link>
  );
}

function Badge({ status }: { status: GameCardProps['status'] }) {
  if (status === 'live') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--color-success-500)]/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
        <span className="size-1.5 animate-pulse rounded-full bg-[color:var(--color-success-500)]" />
        en ligne
      </span>
    );
  }
  if (status === 'soon') {
    return (
      <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
        bientôt
      </span>
    );
  }
  return (
    <span className="rounded-full bg-[color:var(--color-accent-500)]/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-fuchsia-200">
      contribue
    </span>
  );
}
