import { describe, expect, it } from 'vitest';
import { applyMove, evaluate, isCellEmpty, isInBounds, otherMark } from './rules.js';
import { EMPTY_BOARD } from './state.js';

describe('isInBounds', () => {
  it('accepts valid coords', () => {
    expect(isInBounds(0, 0)).toBe(true);
    expect(isInBounds(2, 2)).toBe(true);
  });
  it('rejects out-of-range and non-integers', () => {
    expect(isInBounds(-1, 0)).toBe(false);
    expect(isInBounds(3, 0)).toBe(false);
    expect(isInBounds(1.5, 0)).toBe(false);
  });
});

describe('evaluate', () => {
  it('detects a row win', () => {
    const b = EMPTY_BOARD();
    applyMove(b, 1, 0, 'X');
    applyMove(b, 1, 1, 'X');
    applyMove(b, 1, 2, 'X');
    const r = evaluate(b);
    expect(r.winner).toBe('X');
    expect(r.winLine).toEqual([[1, 0], [1, 1], [1, 2]]);
  });

  it('detects a diagonal win', () => {
    const b = EMPTY_BOARD();
    applyMove(b, 0, 0, 'O');
    applyMove(b, 1, 1, 'O');
    applyMove(b, 2, 2, 'O');
    expect(evaluate(b).winner).toBe('O');
  });

  it('returns draw on full board with no winner', () => {
    const b = EMPTY_BOARD();
    // X O X
    // X O O
    // O X X
    applyMove(b, 0, 0, 'X');
    applyMove(b, 0, 1, 'O');
    applyMove(b, 0, 2, 'X');
    applyMove(b, 1, 0, 'X');
    applyMove(b, 1, 1, 'O');
    applyMove(b, 1, 2, 'O');
    applyMove(b, 2, 0, 'O');
    applyMove(b, 2, 1, 'X');
    applyMove(b, 2, 2, 'X');
    expect(evaluate(b).winner).toBe('draw');
  });

  it('returns null while game is open', () => {
    const b = EMPTY_BOARD();
    applyMove(b, 0, 0, 'X');
    expect(evaluate(b).winner).toBe(null);
  });
});

describe('isCellEmpty', () => {
  it('returns true on empty cell', () => {
    expect(isCellEmpty(EMPTY_BOARD(), 0, 0)).toBe(true);
  });
  it('returns false after move', () => {
    const b = EMPTY_BOARD();
    applyMove(b, 0, 0, 'X');
    expect(isCellEmpty(b, 0, 0)).toBe(false);
  });
});

describe('otherMark', () => {
  it('flips X and O', () => {
    expect(otherMark('X')).toBe('O');
    expect(otherMark('O')).toBe('X');
  });
});
