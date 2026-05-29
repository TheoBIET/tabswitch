'use client';

import type { LobbySnapshot } from '@tabswitch/types';

export function PlateauSettings({ snapshot }: { snapshot: LobbySnapshot }) {
  const playerCount = snapshot.room.players.filter((p) => !p.isSpectator).length;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm text-[color:var(--color-fg-muted)]">
      <p>
        🎲 Le plateau sera généré aléatoirement à chaque partie.{' '}
        <strong className="text-white">{playerCount}/8 joueurs</strong> connectés.
      </p>
    </div>
  );
}
