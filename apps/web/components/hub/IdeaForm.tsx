'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function IdeaForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, body }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Erreur');
        return;
      }
      setPosted(true);
      setTitle('');
      setBody('');
      // refresh list
      router.refresh();
    } catch {
      setError('Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 flex flex-col gap-3">
      <div>
        <label htmlFor="title" className="text-xs uppercase tracking-wider text-[color:var(--color-fg-muted)]">
          Titre
        </label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Ex: Tarot multijoueur en ligne"
          required
        />
      </div>
      <div>
        <label htmlFor="body" className="text-xs uppercase tracking-wider text-[color:var(--color-fg-muted)]">
          Décris le concept
        </label>
        <textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          placeholder="Comment ça se joue ? Pourquoi c'est fun ?"
          rows={4}
          required
          className="mt-1 flex w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2 text-base shadow-inner placeholder:text-[color:var(--color-fg-dim)] focus:border-[color:var(--color-primary-500)]/50 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary-500)]/40"
        />
        <div className="mt-1 text-right text-xs text-[color:var(--color-fg-muted)] tabular-nums">
          {body.length}/2000
        </div>
      </div>
      {error && (
        <div className="rounded-lg border border-[color:var(--color-danger-500)]/30 bg-[color:var(--color-danger-500)]/10 p-2 text-sm text-rose-200">
          {error}
        </div>
      )}
      {posted && !error && (
        <div className="rounded-lg border border-[color:var(--color-success-500)]/30 bg-[color:var(--color-success-500)]/10 p-2 text-sm text-emerald-200">
          ✓ Proposée. Vote pour ton idée pour la pousser en haut.
        </div>
      )}
      <Button
        type="submit"
        variant="accent"
        disabled={submitting || title.length < 4 || body.length < 10}
      >
        {submitting ? 'Envoi…' : 'Proposer'}
      </Button>
    </form>
  );
}
