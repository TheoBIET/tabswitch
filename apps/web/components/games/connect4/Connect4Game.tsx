'use client';

import { useState } from 'react';
import type { LobbySnapshot } from '@tabswitch/types';
import {
  AI_PLAYER_ID,
  COLS,
  CONNECT4_EVENTS,
  ROWS,
  type Color,
  type Connect4ClientView,
} from '@tabswitch/connect4';
import { Button } from '@/components/ui/Button';
import { gameAction, getSocket } from '@/lib/socket';

export function Connect4Game({ snapshot }: { snapshot: LobbySnapshot }) {
  const view = snapshot.gameState as Connect4ClientView | null;
  if (snapshot.room.status === 'LOBBY') {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
        <h2 className="font-display text-xl font-bold">En attente du host…</h2>
        <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
          Le host démarre la partie. Tu peux jouer seul contre l&apos;IA.
        </p>
      </section>
    );
  }
  if (!view) return <div className="rounded-2xl border border-white/10 p-6 text-center">Chargement…</div>;
  return <Board view={view} isHost={snapshot.you.isHost} />;
}

function Board({ view, isHost }: { view: Connect4ClientView; isHost: boolean }) {
  const [pendingCol, setPendingCol] = useState<number | null>(null);
  const [restarting, setRestarting] = useState(false);
  const matchOver = view.matchOutcome !== null;
  const oppColor: Color | null = view.you.color === 'red' ? 'yellow' : view.you.color === 'yellow' ? 'red' : null;
  const playingAi = oppColor != null && view.assignments[oppColor] === AI_PLAYER_ID;

  async function play(col: number) {
    if (!view.you.isYourTurn) return;
    setPendingCol(col);
    const ack = await gameAction(getSocket(), CONNECT4_EVENTS.Move, { col });
    setPendingCol(null);
    if (!ack.ok) alert(ack.message);
  }

  function rematch() {
    setRestarting(true);
    getSocket().emit('lobby:start', {}, (ack) => {
      setRestarting(false);
      if (!ack.ok) alert(ack.message);
    });
  }

  return (
    <section className="flex flex-col items-center gap-6">
      <StatusBanner view={view} playingAi={playingAi} />
      <div
        className="grid w-full max-w-xl gap-1 rounded-2xl border border-white/10 bg-blue-900/60 p-2"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
        role="grid"
        aria-label="Plateau Connect 4"
      >
        {Array.from({ length: COLS }).map((_, c) => {
          const isYourTurn = view.you.isYourTurn;
          const colDisabled = matchOver || view.winner !== null || !isYourTurn || view.board[0]?.[c] != null;
          return (
            <ColumnButton
              key={c}
              col={c}
              cells={Array.from({ length: ROWS }, (_, r) => view.board[r]![c]!)}
              onPlay={() => play(c)}
              disabled={colDisabled}
              loading={pendingCol === c}
              highlighted={view.winLine?.some(([rr, cc]) => cc === c) ?? false}
            />
          );
        })}
      </div>
      {matchOver && (
        <MatchOverPanel view={view} isHost={isHost} restarting={restarting} onRematch={rematch} />
      )}
    </section>
  );
}

function ColumnButton({
  col,
  cells,
  onPlay,
  disabled,
  loading,
  highlighted,
}: {
  col: number;
  cells: Array<'red' | 'yellow' | null>;
  onPlay: () => void;
  disabled: boolean;
  loading: boolean;
  highlighted: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onPlay}
      disabled={disabled}
      aria-label={`Colonne ${col + 1}`}
      className={`flex flex-col gap-1 rounded-md p-1 transition ${
        highlighted ? 'bg-emerald-400/15' : 'hover:bg-white/5'
      } disabled:cursor-default disabled:opacity-60`}
    >
      {cells.map((cell, i) => (
        <span
          key={i}
          className={`aspect-square w-full rounded-full border border-white/10 ${
            cell === 'red'
              ? 'bg-rose-500'
              : cell === 'yellow'
                ? 'bg-amber-300'
                : 'bg-black/40'
          } ${loading && i === 0 ? 'animate-pulse' : ''}`}
        />
      ))}
    </button>
  );
}

function StatusBanner({ view, playingAi }: { view: Connect4ClientView; playingAi: boolean }) {
  let text: string;
  if (view.matchOutcome !== null) {
    const youSeat = view.you.color === 'red' ? 'p1' : view.you.color === 'yellow' ? 'p2' : null;
    if (view.matchOutcome === 'draw') text = 'Match nul.';
    else if (youSeat && view.matchOutcome === youSeat) text = 'Tu gagnes le match !';
    else text = playingAi ? "🤖 L'IA gagne le match." : 'Adv gagne le match.';
  } else if (view.winner !== null) {
    text = view.winner === 'draw' ? 'Manche nulle.' : `${view.winner} gagne la manche.`;
  } else if (view.you.color) {
    text = view.you.isYourTurn
      ? `Ton tour (${view.you.color})`
      : playingAi
        ? "🤖 L'IA réfléchit…"
        : `Tour de ${view.currentPlayer}`;
  } else {
    text = `Spectateur · Tour de ${view.currentPlayer}`;
  }
  return (
    <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-sm font-medium">
      {text}
    </div>
  );
}

function MatchOverPanel({
  view,
  isHost,
  restarting,
  onRematch,
}: {
  view: Connect4ClientView;
  isHost: boolean;
  restarting: boolean;
  onRematch: () => void;
}) {
  const youSeat = view.you.color === 'red' ? 'p1' : view.you.color === 'yellow' ? 'p2' : null;
  const youScore = youSeat === 'p1' ? view.matchScore.p1 : view.matchScore.p2;
  const oppScore = youSeat === 'p1' ? view.matchScore.p2 : view.matchScore.p1;
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
      <p className="text-sm text-[color:var(--color-fg-muted)]">
        Score final : Toi {youScore} — Adv {oppScore}
      </p>
      {isHost ? (
        <Button onClick={onRematch} variant="accent" disabled={restarting}>
          {restarting ? 'Redémarrage…' : 'Rejouer'}
        </Button>
      ) : (
        <p className="text-xs text-[color:var(--color-fg-muted)]">
          En attente que le host relance…
        </p>
      )}
    </div>
  );
}
