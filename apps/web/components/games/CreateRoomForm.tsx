'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getSocket } from '@/lib/socket';
import { usePrefs } from '@/lib/store';

export function CreateRoomForm({
  gameType,
  profileNickname,
}: {
  gameType: string;
  /** Signed-in profile nickname. When set, the form auto-creates and redirects. */
  profileNickname: string;
}) {
  const router = useRouter();
  const { nickname: guestNickname, setNickname: setGuestNickname } = usePrefs();
  const [guestInput, setGuestInput] = useState(guestNickname);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function doCreate(nicknameToUse: string) {
    const cleaned = nicknameToUse.trim();
    if (cleaned.length < 1) {
      setErr('Choisis un pseudo (1-16 chars)');
      return;
    }
    setCreating(true);
    setErr(null);
    if (!profileNickname) setGuestNickname(cleaned);
    await fetch('/api/auth/session', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
    const socket = getSocket();
    socket.emit('lobby:create', { gameType, nickname: cleaned }, (ack) => {
      if (ack.ok) {
        router.push(`/games/${gameType}/${ack.data.code}`);
      } else {
        setCreating(false);
        setErr(ack.message ?? 'Erreur inconnue');
      }
    });
  }

  // Signed-in users skip the form: auto-create a room on mount and redirect.
  const autoCreateTried = useRef(false);
  useEffect(() => {
    if (autoCreateTried.current) return;
    if (!profileNickname) return;
    autoCreateTried.current = true;
    void doCreate(profileNickname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileNickname]);

  // Auto-create UI: a clean loading state, no form.
  if (profileNickname && !err) {
    return (
      <Card>
        <div className="flex items-center gap-3">
          <div className="size-2 animate-pulse rounded-full bg-emerald-400" aria-hidden />
          <p className="text-sm">
            Création de la room en tant que <strong>{profileNickname}</strong>…
          </p>
        </div>
      </Card>
    );
  }

  // Guest path (or signed-in retry after an error).
  function submit(e: React.FormEvent) {
    e.preventDefault();
    void doCreate(profileNickname || guestInput);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label
          htmlFor="nickname"
          className="mb-1 block text-xs uppercase tracking-wider text-[color:var(--color-fg-muted)]"
        >
          Pseudo
        </label>
        <input
          id="nickname"
          value={profileNickname || guestInput}
          onChange={(e) => setGuestInput(e.target.value.slice(0, 16))}
          placeholder="Ton pseudo"
          maxLength={16}
          autoComplete="nickname"
          autoFocus
          disabled={!!profileNickname}
          className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none focus:border-white/40 disabled:opacity-60"
        />
      </div>
      <Button type="submit" disabled={creating} variant="accent" size="lg">
        {creating ? 'Création…' : 'Créer la room →'}
      </Button>
      {err && (
        <p className="text-sm text-rose-300" role="alert">
          {err}
        </p>
      )}
    </form>
  );
}
