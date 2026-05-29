'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

type Idea = {
  id: string;
  title: string;
  body: string;
  status: 'open' | 'planned' | 'building' | 'shipped' | 'closed';
  voteCount: number;
  createdAt: string;
  author: { name: string };
  mine: boolean;
  voted: boolean;
};

const STATUS_LABEL: Record<Idea['status'], { text: string; tone: string }> = {
  open: { text: 'Ouvert', tone: 'bg-white/5 text-[color:var(--color-fg-muted)]' },
  planned: {
    text: 'Planifié',
    tone: 'bg-cyan-500/15 text-cyan-200 border border-cyan-500/30',
  },
  building: {
    text: 'En cours',
    tone: 'bg-amber-500/15 text-amber-200 border border-amber-500/30',
  },
  shipped: {
    text: 'Shippé',
    tone: 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/30',
  },
  closed: { text: 'Fermé', tone: 'bg-white/5 text-[color:var(--color-fg-dim)] line-through' },
};

export function IdeaList({ signedIn }: { signedIn: boolean }) {
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [sort, setSort] = useState<'top' | 'new'>('top');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/ideas?sort=${sort}`, { cache: 'no-store' });
      const data = (await res.json()) as { ideas: Idea[] };
      setIdeas(data.ideas);
    } catch {
      setError('Impossible de charger les idées.');
    }
  }, [sort]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleVote(idea: Idea) {
    if (!signedIn) {
      window.location.href = '/signin?callbackUrl=/ideas';
      return;
    }
    // optimistic
    const next = !idea.voted;
    setIdeas((curr) =>
      curr?.map((i) =>
        i.id === idea.id ? { ...i, voted: next, voteCount: i.voteCount + (next ? 1 : -1) } : i,
      ) ?? null,
    );
    try {
      const res = await fetch('/api/ideas', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: idea.id, vote: next }),
      });
      const data = (await res.json()) as { ok: boolean; voteCount?: number };
      if (data.ok && data.voteCount != null) {
        setIdeas((curr) =>
          curr?.map((i) => (i.id === idea.id ? { ...i, voteCount: data.voteCount! } : i)) ?? null,
        );
      } else if (!data.ok) {
        await load();
      }
    } catch {
      await load();
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">
          Les idées {ideas ? <span className="text-[color:var(--color-fg-muted)]">({ideas.length})</span> : ''}
        </h2>
        <div className="flex gap-1 rounded-lg bg-white/5 p-1 text-xs">
          {(['top', 'new'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSort(s)}
              className={cn(
                'rounded px-3 py-1 transition',
                sort === s ? 'bg-white/10 text-white' : 'text-[color:var(--color-fg-muted)] hover:text-white',
              )}
            >
              {s === 'top' ? '🔥 Top' : '🆕 Nouvelles'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-[color:var(--color-danger-500)]/30 bg-[color:var(--color-danger-500)]/10 p-2 text-sm text-rose-200">
          {error}
        </div>
      )}

      {!ideas && (
        <Card>
          <div className="animate-pulse text-sm text-[color:var(--color-fg-muted)]">
            Chargement…
          </div>
        </Card>
      )}

      {ideas && ideas.length === 0 && (
        <Card>
          <div className="text-sm text-[color:var(--color-fg-muted)]">
            Pas encore d&apos;idées. Sois le premier 🎯
          </div>
        </Card>
      )}

      {ideas?.map((idea) => {
        const s = STATUS_LABEL[idea.status];
        return (
          <Card key={idea.id} className="flex flex-row gap-4 p-4">
            <button
              type="button"
              onClick={() => toggleVote(idea)}
              className={cn(
                'flex h-fit min-w-12 flex-col items-center gap-0.5 rounded-xl border px-2 py-2 text-sm font-bold transition',
                idea.voted
                  ? 'border-[color:var(--color-accent-500)] bg-[color:var(--color-accent-500)]/15 text-fuchsia-200 shadow-[var(--shadow-glow)]'
                  : 'border-white/10 hover:border-white/30',
              )}
              aria-pressed={idea.voted}
              aria-label={idea.voted ? 'Retirer mon vote' : 'Voter'}
            >
              <span className="text-base leading-none">▲</span>
              <span className="font-mono tabular-nums">{idea.voteCount}</span>
            </button>
            <div className="flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-display text-base font-bold">{idea.title}</h3>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                    s.tone,
                  )}
                >
                  {s.text}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-[color:var(--color-fg-muted)]">
                {idea.body}
              </p>
              <div className="mt-2 text-xs text-[color:var(--color-fg-dim)]">
                par {idea.author.name} · {formatDate(idea.createdAt)}
                {idea.mine && ' · toi'}
              </div>
            </div>
          </Card>
        );
      })}
    </section>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  const day = Math.floor(h / 24);
  if (day < 30) return `il y a ${day}j`;
  return d.toLocaleDateString('fr-FR');
}
