'use client';

import type { BestOf } from '@tabswitch/types';

export function BoSelector({
  current,
  options,
  editable,
  onChange,
}: {
  current: BestOf;
  options: readonly BestOf[];
  editable: boolean;
  onChange: (bestOf: BestOf) => void;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="text-xs uppercase tracking-wider text-[color:var(--color-fg-muted)]">
        Format de match
      </div>
      {editable ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {options.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => onChange(o)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                o === current
                  ? 'border-emerald-400/60 bg-emerald-400/15 text-emerald-300'
                  : 'border-white/10 bg-black/30 hover:border-white/30'
              }`}
            >
              BO{o}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-2 text-sm">
          <strong>Best of {current}</strong>{' '}
          <span className="text-[color:var(--color-fg-muted)]">· 🔒 défini par le host</span>
        </div>
      )}
    </section>
  );
}
