import { describe, expect, it } from 'vitest';
import { chooseAiMove } from './ai.js';
import { applyMove, evaluate } from './rules.js';
import { EMPTY_BOARD } from './state.js';

describe('chooseAiMove', () => {
  it('takes the winning move when available', () => {
    const b = EMPTY_BOARD();
    applyMove(b, 0, 0, 'O');
    applyMove(b, 0, 1, 'O');
    // Row 0 col 2 completes the win for O.
    const move = chooseAiMove(b, 'O')!;
    expect(move).toEqual({ row: 0, col: 2 });
  });

  it('blocks an immediate opponent win when no own win exists', () => {
    const b = EMPTY_BOARD();
    applyMove(b, 1, 0, 'X');
    applyMove(b, 1, 1, 'X');
    // O must block at row 1 col 2 or X wins next turn.
    const move = chooseAiMove(b, 'O')!;
    expect(move).toEqual({ row: 1, col: 2 });
  });

  it('prefers winning over blocking when both are available', () => {
    const b = EMPTY_BOARD();
    // O has a 2-in-a-row that can finish.
    applyMove(b, 0, 0, 'O');
    applyMove(b, 0, 1, 'O');
    // X also has a 2-in-a-row threatening to win at (2,2).
    applyMove(b, 2, 0, 'X');
    applyMove(b, 2, 1, 'X');
    const move = chooseAiMove(b, 'O')!;
    expect(move).toEqual({ row: 0, col: 2 });
    // and that move actually wins for O
    applyMove(b, move.row, move.col, 'O');
    expect(evaluate(b).winner).toBe('O');
  });

  it('grabs the center on an empty board', () => {
    const b = EMPTY_BOARD();
    const move = chooseAiMove(b, 'X')!;
    expect(move).toEqual({ row: 1, col: 1 });
  });

  it('picks a corner when the center is taken', () => {
    const b = EMPTY_BOARD();
    applyMove(b, 1, 1, 'X');
    const move = chooseAiMove(b, 'O')!;
    const corners = [
      [0, 0],
      [0, 2],
      [2, 0],
      [2, 2],
    ];
    expect(corners.some(([r, c]) => r === move.row && c === move.col)).toBe(true);
  });
});
