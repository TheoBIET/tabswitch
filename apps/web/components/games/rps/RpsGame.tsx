'use client';

import { useEffect, useState } from 'react';
import type { LobbySnapshot } from '@tabswitch/types';
import {
  CHOICES,
  type Choice,
  RPS_EVENTS,
  type RpsClientView,
} from '@tabswitch/rps';
import { Button } from '@/components/ui/Button';
import { gameAction, getSocket } from '@/lib/socket';

const EMOJI: Record<Choice, string> = {
  rock: '🪨',
  paper: '📄',
  scissors: '✂️',
};

export function RpsGame({ snapshot }: { snapshot: LobbySnapshot }) {
  const view = snapshot.gameState as RpsClientView | null;
  if (snapshot.room.status === 'LOBBY') {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
        <h2 className="font-display text-xl font-bold">En attente du host…</h2>
        <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
          Pierre-Feuille-Ciseaux : 2 joueurs requis. Premier à {Math.ceil((view?.bestOf ?? 5) / 2)}{' '}
          victoires gagne.
        </p>
      </section>
    );
  }
  if (!view) return <div className="rounded-2xl border border-white/10 p-6 text-center">Chargement…</div>;
  return <PickArena view={view} isHost={snapshot.you.isHost} />;
}

function PickArena({ view, isHost }: { view: RpsClientView; isHost: boolean }) {
  const [pickingNow, setPickingNow] = useState<Choice | null>(null);
  const [restarting, setRestarting] = useState(false);
  const [countdown, setCountdown] = useState(secsLeft(view.currentRound.deadline));
  const matchOver = view.matchOutcome !== null;

  useEffect(() => {
    if (view.status !== 'PICKING') return;
    const interval = setInterval(() => setCountdown(secsLeft(view.currentRound.deadline)), 250);
    return () => clearInterval(interval);
  }, [view.status, view.currentRound.deadline]);

  async function pick(choice: Choice) {
    if (view.status !== 'PICKING' || view.you.pickedThisRound) return;
    setPickingNow(choice);
    const ack = await gameAction(getSocket(), RPS_EVENTS.Pick, { choice });
    setPickingNow(null);
    if (!ack.ok) alert(ack.message);
  }

  function rematch() {
    setRestarting(true);
    getSocket().emit('lobby:start', {}, (ack) => {
      setRestarting(false);
      if (!ack.ok) alert(ack.message);
    });
  }

  if (matchOver) {
    return <MatchOver view={view} isHost={isHost} restarting={restarting} onRematch={rematch} />;
  }

  return (
    <section className="flex flex-col items-center gap-6">
      <StatusBanner view={view} countdown={countdown} />
      {view.status === 'REVEALING' ? (
        <RevealedPair view={view} />
      ) : (
        <div className="grid w-full max-w-md grid-cols-3 gap-3">
          {CHOICES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => pick(c)}
              disabled={view.status !== 'PICKING' || view.you.pickedThisRound}
              aria-label={`Choisir ${c}`}
              className={`flex flex-col items-center gap-2 rounded-2xl border p-5 text-4xl transition ${
                pickingNow === c ? 'animate-pulse' : ''
              } ${
                view.you.pickedThisRound && view.you.seat === 'p1' && view.currentRound.p1Choice === c
                  ? 'border-emerald-400/60 bg-emerald-400/10'
                  : view.you.pickedThisRound && view.you.seat === 'p2' && view.currentRound.p2Choice === c
                    ? 'border-emerald-400/60 bg-emerald-400/10'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/30 disabled:opacity-50 disabled:cursor-default'
              }`}
            >
              <span>{EMOJI[c]}</span>
              <span className="text-xs font-semibold uppercase tracking-wider">{c}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function RevealedPair({ view }: { view: RpsClientView }) {
  const youSeat = view.you.seat;
  const yourPick = youSeat === 'p1' ? view.currentRound.p1Choice : view.currentRound.p2Choice;
  const oppPick = youSeat === 'p1' ? view.currentRound.p2Choice : view.currentRound.p1Choice;
  const outcome = view.currentRound.outcome;
  const youWon =
    (outcome === 'p1' && youSeat === 'p1') || (outcome === 'p2' && youSeat === 'p2');
  const oppWon =
    (outcome === 'p1' && youSeat === 'p2') || (outcome === 'p2' && youSeat === 'p1');
  return (
    <div className="grid w-full max-w-md grid-cols-2 gap-4">
      <RevealCard label="Toi" pick={yourPick} winner={youWon} />
      <RevealCard label="Adv" pick={oppPick} winner={oppWon} />
    </div>
  );
}

function RevealCard({
  label,
  pick,
  winner,
}: {
  label: string;
  pick: Choice | null;
  winner: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-2xl border p-6 text-4xl ${
        winner ? 'border-emerald-400/60 bg-emerald-400/10 animate-pulse' : 'border-white/10 bg-white/[0.03]'
      }`}
    >
      <span className="text-xs uppercase tracking-wider text-[color:var(--color-fg-muted)]">{label}</span>
      <span>{pick ? EMOJI[pick] : '⊝'}</span>
      <span className="text-xs font-semibold uppercase tracking-wider">
        {pick ?? 'no pick'}
      </span>
    </div>
  );
}

function StatusBanner({ view, countdown }: { view: RpsClientView; countdown: number }) {
  const oppPicked = view.you.seat === 'p1'
    ? view.currentRound.p2Choice !== null
    : view.you.seat === 'p2'
      ? view.currentRound.p1Choice !== null
      : false;
  let text: string;
  if (view.status === 'REVEALING') {
    if (view.currentRound.outcome === 'draw') text = 'Manche nulle.';
    else text = 'Reveal…';
  } else if (view.status === 'PICKING') {
    if (view.you.pickedThisRound) text = oppPicked ? 'Reveal…' : "Adv réfléchit…";
    else text = oppPicked ? 'Adv a choisi ✓ — à toi !' : 'Choisis ton coup';
  } else {
    text = '…';
  }
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-sm font-medium">
        {text}
      </div>
      {view.status === 'PICKING' && (
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            countdown <= 3 ? 'border-rose-400/60 text-rose-300' : 'border-white/10 text-white'
          }`}
        >
          {String(Math.max(0, countdown)).padStart(2, '0')}s
        </span>
      )}
    </div>
  );
}

function MatchOver({
  view,
  isHost,
  restarting,
  onRematch,
}: {
  view: RpsClientView;
  isHost: boolean;
  restarting: boolean;
  onRematch: () => void;
}) {
  const youSeat = view.you.seat;
  const youScore = youSeat === 'p1' ? view.matchScore.p1 : view.matchScore.p2;
  const oppScore = youSeat === 'p1' ? view.matchScore.p2 : view.matchScore.p1;
  let result: string;
  if (view.matchOutcome === 'draw') result = 'Match nul.';
  else if ((view.matchOutcome === 'p1' && youSeat === 'p1') || (view.matchOutcome === 'p2' && youSeat === 'p2'))
    result = 'Tu gagnes le match !';
  else result = 'Adv gagne le match.';

  return (
    <section className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
      <p className="text-lg font-bold">🏆 {result}</p>
      <p className="text-sm text-[color:var(--color-fg-muted)]">
        Score final : Toi {youScore} — Adv {oppScore}
      </p>
      <ul className="flex flex-wrap justify-center gap-2 text-xs">
        {view.history.map((r) => (
          <li
            key={r.number}
            className="rounded border border-white/10 bg-white/[0.02] px-2 py-1"
            title={`R${r.number} · ${r.p1Choice ?? '⊝'} vs ${r.p2Choice ?? '⊝'}`}
          >
            R{r.number} · {r.outcome === 'draw' ? '⊝' : EMOJI[r.outcome === 'p1' ? (r.p1Choice ?? 'rock') : (r.p2Choice ?? 'rock')]}
          </li>
        ))}
      </ul>
      {isHost ? (
        <Button onClick={onRematch} variant="accent" disabled={restarting}>
          {restarting ? 'Redémarrage…' : 'Rejouer'}
        </Button>
      ) : (
        <p className="text-xs text-[color:var(--color-fg-muted)]">
          En attente que le host relance…
        </p>
      )}
    </section>
  );
}

function secsLeft(deadline: number): number {
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
}
