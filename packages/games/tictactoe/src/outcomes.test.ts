import { describe, expect, it } from 'vitest';
import { deriveOutcomes } from './outcomes.js';
import { EMPTY_BOARD, type TicTacToeState } from './state.js';

function baseState(overrides: Partial<TicTacToeState> = {}): TicTacToeState {
  return {
    board: EMPTY_BOARD(),
    currentPlayer: 'X',
    assignments: { X: 'p1', O: 'p2' },
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

describe('deriveOutcomes (tictactoe match-level)', () => {
  it('returns null while matchOutcome is null', () => {
    expect(deriveOutcomes(baseState())).toBeNull();
  });

  it('p1 wins → X "won", O "lost"', () => {
    expect(deriveOutcomes(baseState({ matchOutcome: 'p1' }))).toEqual({
      p1: 'won',
      p2: 'lost',
    });
  });

  it('p2 wins → X "lost", O "won"', () => {
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

  it('omits any seat with no assigned playerId', () => {
    expect(
      deriveOutcomes(
        baseState({ matchOutcome: 'p1', assignments: { X: 'p1', O: null } }),
      ),
    ).toEqual({ p1: 'won' });
  });
});
