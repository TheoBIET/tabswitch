import type { GameOutcome, GameOutcomes } from '@tabswitch/types';
import type { Connect4State } from './state.js';

/**
 * Match-level outcomes for the room manager. Returns null while
 * `state.matchOutcome` is null (match still on).
 */
export function deriveOutcomes(state: Connect4State): GameOutcomes | null {
  if (state.matchOutcome === null) return null;
  const out: GameOutcomes = {};
  const red = state.assignments.red;
  const yellow = state.assignments.yellow;

  function setOutcome(seat: string | null, outcome: GameOutcome) {
    if (seat) out[seat] = outcome;
  }

  if (state.matchOutcome === 'draw') {
    setOutcome(red, 'draw');
    setOutcome(yellow, 'draw');
  } else if (state.matchOutcome === 'p1') {
    setOutcome(red, 'won');
    setOutcome(yellow, 'lost');
  } else {
    setOutcome(red, 'lost');
    setOutcome(yellow, 'won');
  }
  return out;
}
