import { describe, expect, it } from 'vitest';
import {
  applyRound,
  BEST_OF_OPTIONS,
  isMatchOver,
  matchWinner,
  requiredWins,
  type MatchScore,
} from './match.js';

const empty: MatchScore = { p1: 0, p2: 0, draws: 0 };

describe('requiredWins', () => {
  it('returns ceil(N/2) for each BO option', () => {
    expect(requiredWins(1)).toBe(1);
    expect(requiredWins(3)).toBe(2);
    expect(requiredWins(5)).toBe(3);
    expect(requiredWins(7)).toBe(4);
  });
});

describe('BEST_OF_OPTIONS', () => {
  it('lists the four canonical values in order', () => {
    expect([...BEST_OF_OPTIONS]).toEqual([1, 3, 5, 7]);
  });
});

describe('applyRound', () => {
  it('increments p1 when p1 wins the round', () => {
    expect(applyRound(empty, 'p1')).toEqual({ p1: 1, p2: 0, draws: 0 });
  });
  it('increments p2 when p2 wins the round', () => {
    expect(applyRound(empty, 'p2')).toEqual({ p1: 0, p2: 1, draws: 0 });
  });
  it('increments draws on draw outcome', () => {
    expect(applyRound(empty, 'draw')).toEqual({ p1: 0, p2: 0, draws: 1 });
  });
  it('is immutable', () => {
    const before: MatchScore = { p1: 2, p2: 1, draws: 0 };
    const after = applyRound(before, 'p1');
    expect(before).toEqual({ p1: 2, p2: 1, draws: 0 });
    expect(after).toEqual({ p1: 3, p2: 1, draws: 0 });
  });
});

describe('isMatchOver', () => {
  it('true on first win in BO1', () => {
    expect(isMatchOver({ p1: 1, p2: 0, draws: 0 }, 1)).toBe(true);
  });
  it('false in BO5 at 2-2', () => {
    expect(isMatchOver({ p1: 2, p2: 2, draws: 0 }, 5)).toBe(false);
  });
  it('true in BO5 at 3-2', () => {
    expect(isMatchOver({ p1: 3, p2: 2, draws: 0 }, 5)).toBe(true);
  });
  it('hard cap: 2 × bestOf rounds total played ends the match', () => {
    expect(isMatchOver({ p1: 2, p2: 1, draws: 3 }, 3)).toBe(true);
  });
});

describe('matchWinner', () => {
  it('returns p1 when p1 leads', () => {
    expect(matchWinner({ p1: 3, p2: 2, draws: 0 })).toBe('p1');
  });
  it('returns p2 when p2 leads', () => {
    expect(matchWinner({ p1: 1, p2: 3, draws: 1 })).toBe('p2');
  });
  it('returns draw when equal', () => {
    expect(matchWinner({ p1: 2, p2: 2, draws: 1 })).toBe('draw');
  });
});
