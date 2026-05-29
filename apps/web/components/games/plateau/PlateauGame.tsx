'use client';

import type { LobbySnapshot } from '@tabswitch/types';
import type { PlateauClientView } from '@tabswitch/plateau';
import { DiceRoller } from './DiceRoller';
import { VoteOverlay } from './overlays/VoteOverlay';
import { SwapOverlay } from './overlays/SwapOverlay';
import { MinigameOverlay } from './overlays/MinigameOverlay';

const CELL_COLOR: Record<string, string> = {
  start: '#22c55e',
  normal: '#3f3f46',
  bonus: '#16a34a',
  malus: '#dc2626',
  safe: '#2563eb',
  event: '#7c3aed',
  finish: '#eab308',
};

export function PlateauGame({ snapshot }: { snapshot: LobbySnapshot }) {
  const view = snapshot.gameState as PlateauClientView | null | undefined;

  if (!view) {
    return <div className="rounded-2xl border border-white/10 p-6 text-center">Chargement…</div>;
  }

  if (view.phase === 'GAME_OVER') {
    return <GameOverScreen view={view} />;
  }

  const myDice = view.turn.dice[view.you.playerId];
  const canRoll = view.phase === 'ROLLING' && myDice === undefined;

  return (
    <>
      {view.phase === 'VOTE' && <VoteOverlay view={view} />}
      {view.phase === 'SWAP' && <SwapOverlay view={view} />}
      {(view.phase === 'MINIGAME_EVENT' || view.phase === 'MINIGAME_END_OF_TURN') && (
        <MinigameOverlay view={view} snapshot={snapshot} />
      )}

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex-1">
          <PlateauBoard view={view} />
        </div>
        <div className="flex w-full flex-col gap-3 lg:w-64">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <p className="mb-2 text-xs uppercase tracking-wider text-[color:var(--color-fg-muted)]">
              {view.phase === 'ROLLING' ? 'Lancez les dés !' : `Phase : ${view.phase}`}
            </p>
            <DiceRoller canRoll={canRoll} result={myDice} />
          </div>
          <PlateauSidebar view={view} />
        </div>
      </div>
    </>
  );
}

function PlateauBoard({ view }: { view: PlateauClientView }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <svg viewBox="0 0 680 500" className="w-full">
        {/* Liens entre cases */}
        {view.board.map((cell) =>
          cell.neighbors.map((nId) => {
            const neighbor = view.board.find((c) => c.id === nId);
            if (!neighbor) return null;
            return (
              <line
                key={`${cell.id}-${nId}`}
                x1={cell.position.x}
                y1={cell.position.y}
                x2={neighbor.position.x}
                y2={neighbor.position.y}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={2}
              />
            );
          })
        )}
        {/* Cases */}
        {view.board.map((cell) => (
          <g key={cell.id}>
            <circle
              cx={cell.position.x}
              cy={cell.position.y}
              r={14}
              fill={CELL_COLOR[cell.type] ?? '#3f3f46'}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={1}
            />
            {cell.type === 'event' && (
              <text
                x={cell.position.x}
                y={cell.position.y + 4}
                textAnchor="middle"
                fontSize={10}
                fill="white"
              >
                {cell.event === 'minigame' ? '⚡' : cell.event === 'vote' ? '🗳' : '🔀'}
              </text>
            )}
          </g>
        ))}
        {/* Pions (avatars simplifiés) */}
        {view.players.map((player, i) => {
          const cell = view.board.find((c) => c.id === player.cellId);
          if (!cell) return null;
          const offset = (i - (view.players.length - 1) / 2) * 10;
          return (
            <g key={player.id}>
              <circle
                cx={cell.position.x + offset}
                cy={cell.position.y - 18}
                r={8}
                fill="white"
                opacity={0.9}
                stroke="rgba(0,0,0,0.3)"
                strokeWidth={1}
              />
              <text
                x={cell.position.x + offset}
                y={cell.position.y - 15}
                textAnchor="middle"
                fontSize={9}
                fill="#0c0c10"
                fontWeight="bold"
              >
                {player.nickname.slice(0, 2).toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function PlateauSidebar({ view }: { view: PlateauClientView }) {
  const activeId = view.turn.playerOrder[view.turn.activeIndex];
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
        Tour {view.turn.number}
      </h3>
      <ul className="flex flex-col gap-2">
        {view.players.map((player) => {
          const cell = view.board.find((c) => c.id === player.cellId);
          const isActive = player.id === activeId;
          return (
            <li
              key={player.id}
              className={`flex items-center gap-2 rounded-lg px-2 py-1 text-sm ${isActive ? 'bg-white/10' : ''}`}
            >
              <span className="font-medium">{player.nickname}</span>
              <span className="ml-auto text-xs text-[color:var(--color-fg-muted)]">
                case {cell?.index ?? '?'}
              </span>
              {view.turn.dice[player.id] !== undefined && (
                <span className="rounded border border-white/20 px-1 text-xs">
                  🎲{view.turn.dice[player.id]}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex flex-col gap-1">
        {view.eventLog.map((msg, i) => (
          <p key={i} className="text-[11px] text-[color:var(--color-fg-muted)]">
            {msg}
          </p>
        ))}
      </div>
    </div>
  );
}

function GameOverScreen({ view }: { view: PlateauClientView }) {
  const sorted = [...view.players].sort((a, b) => {
    if (a.arrivedAt !== null && b.arrivedAt !== null) return a.arrivedAt - b.arrivedAt;
    if (a.arrivedAt !== null) return -1;
    if (b.arrivedAt !== null) return 1;
    const ca = view.board.find((c) => c.id === a.cellId);
    const cb = view.board.find((c) => c.id === b.cellId);
    return (cb?.index ?? 0) - (ca?.index ?? 0);
  });

  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
      <h2 className="font-display text-3xl font-bold">Partie terminée !</h2>
      <ol className="flex flex-col gap-3">
        {sorted.map((player, i) => (
          <li key={player.id} className="flex items-center gap-3 text-lg">
            <span className="text-2xl">{['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`}</span>
            <span className="font-semibold">{player.nickname}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
