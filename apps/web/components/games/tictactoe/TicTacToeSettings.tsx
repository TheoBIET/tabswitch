'use client';

import type { BestOf, LobbySnapshot } from '@tabswitch/types';
import type { TicTacToeClientView } from '@tabswitch/tictactoe';
import { gameAction, getSocket } from '@/lib/socket';
import { gameLabel } from '@/lib/constants';
import { BoSelector } from './BoSelector';

export function TicTacToeSettings({ snapshot }: { snapshot: LobbySnapshot }) {
  const view = snapshot.gameState as TicTacToeClientView | null;
  if (!view) return null;
  const meta = gameLabel('tictactoe');
  const isHost = snapshot.you.isHost;
  const editable = isHost && snapshot.room.status === 'LOBBY';

  async function setBo(bestOf: BestOf) {
    const ack = await gameAction(getSocket(), 'settings:update', { bestOf });
    if (!ack.ok) alert(ack.message);
  }

  return (
    <BoSelector
      current={view.bestOf}
      options={meta.bestOfOptions}
      editable={editable}
      onChange={setBo}
    />
  );
}
