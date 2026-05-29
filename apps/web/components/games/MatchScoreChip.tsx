'use client';

import type { MatchScore } from '@tabswitch/types';

export function MatchScoreChip({
  matchScore,
  youSeat,
  roundNumber,
}: {
  matchScore: MatchScore;
  youSeat: 'p1' | 'p2' | null;
  roundNumber: number;
}) {
  const youScore = youSeat === 'p1' ? matchScore.p1 : matchScore.p2;
  const oppScore = youSeat === 'p1' ? matchScore.p2 : matchScore.p1;
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold">
      Manche {roundNumber} — Toi {youScore} · Adv {oppScore}
    </span>
  );
}
