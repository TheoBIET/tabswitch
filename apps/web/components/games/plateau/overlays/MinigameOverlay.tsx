'use client';

import type { LobbySnapshot } from '@tabswitch/types';
import type { PlateauClientView } from '@tabswitch/plateau';
import { TicTacToeGame } from '@/components/games/tictactoe/TicTacToeGame';
import { Connect4Game } from '@/components/games/connect4/Connect4Game';
import { RpsGame } from '@/components/games/rps/RpsGame';

export function MinigameOverlay({
  view,
  snapshot,
}: {
  view: PlateauClientView;
  snapshot: LobbySnapshot;
}) {
  if (view.phase !== 'MINIGAME_EVENT' && view.phase !== 'MINIGAME_END_OF_TURN') return null;
  if (!view.pendingEvent || view.pendingEvent.type !== 'minigame') return null;

  const { gameType, miniState } = view.pendingEvent;

  const miniSnapshot: LobbySnapshot = {
    ...snapshot,
    gameState: miniState,
  };

  let GameComponent: React.FC<{ snapshot: LobbySnapshot }> | null = null;
  if (gameType === 'tictactoe') GameComponent = TicTacToeGame;
  if (gameType === 'connect4') GameComponent = Connect4Game;
  if (gameType === 'rps') GameComponent = RpsGame;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-4">
      <div className="mb-4 text-center">
        <p className="text-xs uppercase tracking-widest text-[color:var(--color-fg-muted)]">
          Mini-jeu
        </p>
        <h2 className="font-display text-2xl font-bold capitalize">
          {gameType.replace(/-/g, ' ')}
        </h2>
        <p className="text-sm text-[color:var(--color-fg-muted)]">
          Le gagnant avance de 2 cases !
        </p>
      </div>
      <div className="w-full max-w-2xl">
        {GameComponent ? (
          <GameComponent snapshot={miniSnapshot} />
        ) : (
          <p className="text-center text-[color:var(--color-fg-muted)]">
            Mini-jeu inconnu : {gameType}
          </p>
        )}
      </div>
    </div>
  );
}
