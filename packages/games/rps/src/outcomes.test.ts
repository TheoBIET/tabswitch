import { describe, expect, it } from 'vitest';
import { deriveOutcomes } from './outcomes.js';
import type { RpsState } from './state.js';

function baseState(overrides: Partial<RpsState> = {}): RpsState {
  return {
    status: 'MATCH_OVER',
    bestOf: 3,
    assignments: { p1: 'pa', p2: 'pb' },
    matchScore: { p1: 2, p2: 0, draws: 0 },
    currentRound: {
      number: 1,
      p1Choice: null,
      p2Choice: null,
      deadline: 0,
      outcome: null,
    },
    history: [],
    matchOutcome: 'p1',
    ...overrides,
  };
}

describe('deriveOutcomes (rps)', () => {
  it('returns null while the match has not ended', () => {
    expect(deriveOutcomes(baseState({ matchOutcome: null }))).toBeNull();
  });

  it('p1 wins → seat p1 "won", seat p2 "lost"', () => {
    expect(deriveOutcomes(baseState({ matchOutcome: 'p1' }))).toEqual({
      pa: 'won',
      pb: 'lost',
    });
  });

  it('p2 wins → seat p2 "won", seat p1 "lost"', () => {
    expect(deriveOutcomes(baseState({ matchOutcome: 'p2' }))).toEqual({
      pa: 'lost',
      pb: 'won',
    });
  });

  it('draw match → both "draw"', () => {
    expect(deriveOutcomes(baseState({ matchOutcome: 'draw' }))).toEqual({
      pa: 'draw',
      pb: 'draw',
    });
  });

  it('omits a seat without assigned playerId', () => {
    expect(
      deriveOutcomes(
        baseState({ matchOutcome: 'p1', assignments: { p1: 'pa', p2: null } }),
      ),
    ).toEqual({ pa: 'won' });
  });
});
