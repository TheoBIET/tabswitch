import type { GameOutcome, GameOutcomes } from '@tabswitch/types';
import type { RpsState } from './state.js';

export function deriveOutcomes(state: RpsState): GameOutcomes | null {
  if (state.matchOutcome === null) return null;
  const out: GameOutcomes = {};
  const p1 = state.assignments.p1;
  const p2 = state.assignments.p2;

  function setOutcome(seat: string | null, outcome: GameOutcome) {
    if (seat) out[seat] = outcome;
  }

  if (state.matchOutcome === 'draw') {
    setOutcome(p1, 'draw');
    setOutcome(p2, 'draw');
  } else if (state.matchOutcome === 'p1') {
    setOutcome(p1, 'won');
    setOutcome(p2, 'lost');
  } else {
    setOutcome(p1, 'lost');
    setOutcome(p2, 'won');
  }
  return out;
}
