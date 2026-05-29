import { describe, expect, it } from 'vitest';
import { deriveOutcomes } from './outcomes.js';
import { EMPTY_BOARD, type Connect4State } from './state.js';

function baseState(overrides: Partial<Connect4State> = {}): Connect4State {
  return {
    board: EMPTY_BOARD(),
    currentPlayer: 'red',
    assignments: { red: 'p1', yellow: 'p2' },
    winner: null,
    winLine: null,
    matchNumber: 1,
    roundNumber: 1,
    bestOf: 1,
    matchScore: { p1: 0, p2: 0, draws: 0 },
    matchOutcome: null,
    ...overrides,
  };
}

describe('deriveOutcomes (connect4)', () => {
  it('returns null while the match has not ended', () => {
    expect(deriveOutcomes(baseState())).toBeNull();
  });

  it('p1 (red) wins → red "won", yellow "lost"', () => {
    expect(deriveOutcomes(baseState({ matchOutcome: 'p1' }))).toEqual({
      p1: 'won',
      p2: 'lost',
    });
  });

  it('p2 (yellow) wins → yellow "won", red "lost"', () => {
    expect(deriveOutcomes(baseState({ matchOutcome: 'p2' }))).toEqual({
      p1: 'lost',
      p2: 'won',
    });
  });

  it('draw match → both "draw"', () => {
    expect(deriveOutcomes(baseState({ matchOutcome: 'draw' }))).toEqual({
      p1: 'draw',
      p2: 'draw',
    });
  });

  it('omits any seat without an assigned playerId', () => {
    expect(
      deriveOutcomes(
        baseState({ matchOutcome: 'p1', assignments: { red: 'p1', yellow: null } }),
      ),
    ).toEqual({ p1: 'won' });
  });
});
