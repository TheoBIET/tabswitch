'use client';

import { useState } from 'react';
import type { LobbySnapshot } from '@tabswitch/types';
import {
  AI_PLAYER_ID,
  TICTACTOE_EVENTS,
  type TicTacToeClientView,
  type Cell,
  type Mark,
} from '@tabswitch/tictactoe';
import { Button } from '@/components/ui/Button';
import { gameAction, getSocket } from '@/lib/socket';

export function TicTacToeGame({ snapshot }: { snapshot: LobbySnapshot }) {
  const view = snapshot.gameState as TicTacToeClientView | null | undefined;

  if (snapshot.room.status === 'LOBBY') {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
        <h2 className="font-display text-xl font-bold">En attente du host…</h2>
        <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
          Le host démarre la partie. Tu peux jouer seul contre l&apos;IA (1 joueur min).
        </p>
      </section>
    );
  }

  if (!view) {
    return <div className="rounded-2xl border border-white/10 p-6 text-center">Chargement…</div>;
  }

  return <Board view={view} isHost={snapshot.you.isHost} />;
}

function opponentMark(you: Mark | null): Mark | null {
  if (you === 'X') return 'O';
  if (you === 'O') return 'X';
  return null;
}

function isAiSeat(view: TicTacToeClientView, mark: Mark): boolean {
  return view.assignments[mark] === AI_PLAYER_ID;
}

function Board({
  view,
  isHost,
}: {
  view: TicTacToeClientView;
  isHost: boolean;
}) {
  const [pending, setPending] = useState<{ row: number; col: number } | null>(null);
  const [restarting, setRestarting] = useState(false);
  const isOver = view.winner !== null || view.matchOutcome !== null;
  const oppMark = opponentMark(view.you.mark);
  const playingAi = oppMark != null && isAiSeat(view, oppMark);

  async function play(row: number, col: number) {
    if (!view.you.isYourTurn) return;
    if (view.board[row]?.[col] != null) return;
    setPending({ row, col });
    const ack = await gameAction(getSocket(), TICTACTOE_EVENTS.Move, { row, col });
    setPending(null);
    if (!ack.ok) alert(ack.message);
  }

  // Rematch goes through lobby:start, which the server already handles as a
  // fresh-game request when the room is in ENDED status (resetGame instance).
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
        className="grid aspect-square w-full max-w-md grid-cols-3 grid-rows-3 gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2"
        role="grid"
        aria-label="Plateau de tic-tac-toe"
      >
        {view.board.map((row, r) =>
          row.map((cell, c) => (
            <CellButton
              key={`${r}-${c}`}
              cell={cell}
              onClick={() => play(r, c)}
              disabled={cell != null || !view.you.isYourTurn || isOver}
              highlighted={isOnWinLine(view.winLine, r, c)}
              loading={pending?.row === r && pending?.col === c}
            />
          )),
        )}
      </div>
      {view.matchOutcome !== null &&
        (isHost ? (
          <Button onClick={rematch} variant="accent" disabled={restarting}>
            {restarting ? 'Redémarrage…' : 'Rejouer'}
          </Button>
        ) : (
          <p className="text-xs text-[color:var(--color-fg-muted)]">
            En attente que le host relance…
          </p>
        ))}
    </section>
  );
}

function CellButton({
  cell,
  onClick,
  disabled,
  highlighted,
  loading,
}: {
  cell: Cell;
  onClick: () => void;
  disabled: boolean;
  highlighted: boolean;
  loading: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center rounded-xl border text-5xl font-bold transition ${
        highlighted
          ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-300'
          : 'border-white/10 bg-black/30 hover:border-white/30 disabled:opacity-50 disabled:cursor-default'
      } ${loading ? 'animate-pulse' : ''}`}
      aria-label={cell ? `Case ${cell}` : 'Case vide'}
    >
      {cell ?? ''}
    </button>
  );
}

function StatusBanner({
  view,
  playingAi,
}: {
  view: TicTacToeClientView;
  playingAi: boolean;
}) {
  const { winner, you, currentPlayer, assignments, matchOutcome } = view;
  const currentSeat = assignments[currentPlayer];
  const currentIsAi = currentSeat === AI_PLAYER_ID;

  let text: string;
  if (matchOutcome !== null) {
    if (matchOutcome === 'draw') text = 'Match nul.';
    else if ((matchOutcome === 'p1' && you.mark === 'X') || (matchOutcome === 'p2' && you.mark === 'O'))
      text = 'Tu gagnes le match !';
    else text = playingAi ? `🤖 L'IA gagne le match.` : 'Adv gagne le match.';
  } else if (winner === 'draw') {
    text = 'Manche nulle.';
  } else if (winner === 'X' || winner === 'O') {
    text = `${winner} gagne la manche.`;
  } else if (you.mark) {
    if (you.isYourTurn) text = `Ton tour (${you.mark})`;
    else if (currentIsAi) text = `🤖 L'IA réfléchit (${currentPlayer})…`;
    else text = `Tour de ${currentPlayer}`;
  } else {
    text = `Spectateur · Tour de ${currentPlayer}`;
  }
  return (
    <div className="flex items-center gap-2">
      <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-sm font-medium">
        {text}
      </div>
      {playingAi && matchOutcome === null && (
        <span
          className="rounded-full border border-fuchsia-400/40 bg-fuchsia-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-fuchsia-200"
          title="Tu joues contre l'IA"
        >
          vs 🤖 IA
        </span>
      )}
    </div>
  );
}

function isOnWinLine(
  line: TicTacToeClientView['winLine'],
  row: number,
  col: number,
): boolean {
  if (!line) return false;
  return line.some(([r, c]) => r === row && c === col);
}
