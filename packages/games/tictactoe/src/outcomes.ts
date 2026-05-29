import type { GameOutcome, GameOutcomes } from '@tabswitch/types';
import type { TicTacToeState } from './state.js';

/**
 * Match-level outcomes. Returns null while `state.matchOutcome` is null.
 * Mapping: assignments.X = p1, assignments.O = p2.
 */
export function deriveOutcomes(state: TicTacToeState): GameOutcomes | null {
  if (state.matchOutcome === null) return null;
  const out: GameOutcomes = {};
  const x = state.assignments.X;
  const o = state.assignments.O;

  function setOutcome(seat: string | null, outcome: GameOutcome) {
    if (seat) out[seat] = outcome;
  }

  if (state.matchOutcome === 'draw') {
    setOutcome(x, 'draw');
    setOutcome(o, 'draw');
  } else if (state.matchOutcome === 'p1') {
    setOutcome(x, 'won');
    setOutcome(o, 'lost');
  } else {
    setOutcome(x, 'lost');
    setOutcome(o, 'won');
  }
  return out;
}
