'use client';

import { gameAction, getSocket } from '@/lib/socket';
import { PLATEAU_EVENTS } from '@tabswitch/plateau';
import type { PlateauClientView } from '@tabswitch/plateau';
import { Button } from '@/components/ui/Button';

export function SwapOverlay({ view }: { view: PlateauClientView }) {
  if (!view.pendingEvent || view.pendingEvent.type !== 'swap') return null;
  const { initiatorId, targetId } = view.pendingEvent;
  const isInitiator = view.you.playerId === initiatorId;
  const initiator = view.players.find((p) => p.id === initiatorId);

  async function selectTarget(targetPlayerId: string) {
    const ack = await gameAction(getSocket(), PLATEAU_EVENTS.SwapTarget, { targetId: targetPlayerId });
    if (!ack.ok) alert(ack.message);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-white/10 bg-[#0c0c10] p-6">
        <h2 className="text-center text-xl font-bold">
          {isInitiator
            ? '🔀 Choisis avec qui échanger'
            : `${initiator?.nickname ?? '?'} choisit son échange…`}
        </h2>
        {isInitiator && !targetId ? (
          <div className="flex flex-col gap-2">
            {view.players
              .filter((p) => p.id !== initiatorId)
              .map((player) => (
                <Button key={player.id} onClick={() => selectTarget(player.id)} variant="ghost">
                  {player.nickname}{' '}
                  <span className="ml-2 text-xs text-[color:var(--color-fg-muted)]">
                    case {view.board.find((c) => c.id === player.cellId)?.index ?? '?'}
                  </span>
                </Button>
              ))}
          </div>
        ) : (
          <p className="text-center text-sm text-[color:var(--color-fg-muted)]">En attente…</p>
        )}
      </div>
    </div>
  );
}
