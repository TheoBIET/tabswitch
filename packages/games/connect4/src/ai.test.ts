import { describe, expect, it } from 'vitest';
import { chooseAiMove } from './ai.js';
import { dropPiece } from './rules.js';
import { EMPTY_BOARD } from './state.js';

describe('chooseAiMove (connect4)', () => {
  it('grabs the center column on an empty board', () => {
    expect(chooseAiMove(EMPTY_BOARD(), 'red')).toBe(3);
  });

  it('takes the winning move when available', () => {
    let board = EMPTY_BOARD();
    board = dropPiece(board, 0, 'yellow')!.board;
    board = dropPiece(board, 1, 'yellow')!.board;
    board = dropPiece(board, 2, 'yellow')!.board;
    expect(chooseAiMove(board, 'yellow')).toBe(3);
  });

  it('blocks the opponent immediate win', () => {
    let board = EMPTY_BOARD();
    board = dropPiece(board, 0, 'red')!.board;
    board = dropPiece(board, 1, 'red')!.board;
    board = dropPiece(board, 2, 'red')!.board;
    expect(chooseAiMove(board, 'yellow')).toBe(3);
  });

  it('prefers winning over blocking when both are available', () => {
    let board = EMPTY_BOARD();
    board = dropPiece(board, 0, 'yellow')!.board;
    board = dropPiece(board, 1, 'yellow')!.board;
    board = dropPiece(board, 2, 'yellow')!.board;
    board = dropPiece(board, 4, 'red')!.board;
    board = dropPiece(board, 5, 'red')!.board;
    board = dropPiece(board, 6, 'red')!.board;
    expect(chooseAiMove(board, 'yellow')).toBe(3);
  });

  it('returns null when no column is available', () => {
    // period-2 column pairing: verified no 4-in-a-row
    const draw: Array<Array<'red' | 'yellow'>> = [
      ['red',    'red',    'yellow', 'yellow', 'red',    'red',    'yellow'],
      ['yellow', 'yellow', 'red',    'red',    'yellow', 'yellow', 'red'],
      ['red',    'red',    'yellow', 'yellow', 'red',    'red',    'yellow'],
      ['yellow', 'yellow', 'red',    'red',    'yellow', 'yellow', 'red'],
      ['red',    'red',    'yellow', 'yellow', 'red',    'red',    'yellow'],
      ['yellow', 'yellow', 'red',    'red',    'yellow', 'yellow', 'red'],
    ];
    expect(chooseAiMove(draw as never, 'red')).toBeNull();
  });
});
