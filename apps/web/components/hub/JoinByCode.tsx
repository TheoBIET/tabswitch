'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

/**
 * Lets a player jump straight into a room when they know the code.
 * They'll be prompted for a nickname on the game page itself.
 */
export function JoinByCode() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [err, setErr] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (!/^[A-Z]{4}$/.test(clean)) {
      setErr('Code en 4 lettres (ex: ABCD)');
      return;
    }
    setErr(null);
    router.push(`/r/${clean}`);
  }

  return (
    <form
      onSubmit={submit}
      className="flex h-full w-full flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
    >
      <div>
        <label
          htmlFor="join-code"
          className="block text-xs uppercase tracking-wider text-[color:var(--color-fg-muted)]"
        >
          Rejoindre via code
        </label>
        <p className="mt-0.5 text-[11px] text-[color:var(--color-fg-muted)]">
          On t&apos;a partagé un code ? Tape-le ici.
        </p>
      </div>
      <input
        id="join-code"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
        placeholder="ABCD"
        maxLength={4}
        autoComplete="off"
        aria-describedby={err ? 'join-code-err' : undefined}
        className="rounded-lg border border-white/15 bg-black/30 px-3 py-2.5 text-center font-mono text-xl tracking-[0.4em] uppercase outline-none focus:border-white/40"
      />
      <Button type="submit" variant="primary" className="mt-auto">
        Rejoindre →
      </Button>
      {err && (
        <p id="join-code-err" className="text-xs text-rose-300" role="alert">
          {err}
        </p>
      )}
    </form>
  );
}
