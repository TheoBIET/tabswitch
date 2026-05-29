'use client';

import { gameAction, getSocket } from '@/lib/socket';
import { PLATEAU_EVENTS } from '@tabswitch/plateau';
import type { PlateauClientView, VoteOption } from '@tabswitch/plateau';
import { Button } from '@/components/ui/Button';

const OPTIONS: { value: VoteOption; label: string }[] = [
  { value: 'reculer', label: '⬅️ Reculer 3 cases' },
  { value: 'passer_tour', label: '⏭ Passer son prochain tour' },
  { value: 'echanger_dernier', label: '🔀 Échanger avec le dernier' },
];

export function VoteOverlay({ view }: { view: PlateauClientView }) {
  if (!view.pendingEvent || view.pendingEvent.type !== 'vote') return null;
  const { targetPlayerId, votes } = view.pendingEvent;
  const target = view.players.find((p) => p.id === targetPlayerId);
  const myVote = votes[view.you.playerId];
  const isTarget = view.you.playerId === targetPlayerId;

  async function vote(option: VoteOption) {
    const ack = await gameAction(getSocket(), PLATEAU_EVENTS.Vote, { option });
    if (!ack.ok) alert(ack.message);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-white/10 bg-[#0c0c10] p-6">
        <h2 className="text-center text-xl font-bold">
          Vote contre <span className="text-rose-300">{target?.nickname ?? '?'}</span>
        </h2>
        {isTarget ? (
          <p className="text-center text-sm text-[color:var(--color-fg-muted)]">
            Les autres joueurs votent contre toi…
          </p>
        ) : myVote ? (
          <p className="text-center text-sm text-emerald-300">
            Tu as voté : <strong>{OPTIONS.find((o) => o.value === myVote)?.label}</strong>
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {OPTIONS.map((opt) => (
              <Button key={opt.value} onClick={() => vote(opt.value)} variant="ghost">
                {opt.label}
              </Button>
            ))}
          </div>
        )}
        <p className="text-center text-xs text-[color:var(--color-fg-muted)]">
          {Object.keys(votes).length}/{view.players.length - 1} votes reçus
        </p>
      </div>
    </div>
  );
}
