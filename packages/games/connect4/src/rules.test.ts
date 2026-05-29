import { describe, expect, it } from 'vitest';
import {
  availableColumns,
  dropPiece,
  evaluate,
  isColumnFull,
} from './rules.js';
import { EMPTY_BOARD, ROWS } from './state.js';

describe('dropPiece', () => {
  it('drops the piece in the bottom-most empty row of an empty column', () => {
    const board = EMPTY_BOARD();
    const res = dropPiece(board, 3, 'red');
    expect(res).not.toBeNull();
    expect(res!.row).toBe(ROWS - 1);
    expect(res!.board[ROWS - 1]![3]).toBe('red');
  });

  it('stacks pieces on top of each other within a column', () => {
    let board = EMPTY_BOARD();
    board = dropPiece(board, 2, 'red')!.board;
    const res = dropPiece(board, 2, 'yellow');
    expect(res!.row).toBe(ROWS - 2);
    expect(res!.board[ROWS - 1]![2]).toBe('red');
    expect(res!.board[ROWS - 2]![2]).toBe('yellow');
  });

  it('returns null when the column is full', () => {
    let board = EMPTY_BOARD();
    for (let i = 0; i < ROWS; i++) {
      board = dropPiece(board, 0, i % 2 === 0 ? 'red' : 'yellow')!.board;
    }
    expect(dropPiece(board, 0, 'red')).toBeNull();
  });
});

describe('isColumnFull', () => {
  it('false when at least one cell is empty', () => {
    expect(isColumnFull(EMPTY_BOARD(), 0)).toBe(false);
  });
  it('true when all rows in the column are filled', () => {
    let board = EMPTY_BOARD();
    for (let i = 0; i < ROWS; i++) {
      board = dropPiece(board, 1, 'red')!.board;
    }
    expect(isColumnFull(board, 1)).toBe(true);
  });
});

describe('availableColumns', () => {
  it('returns all columns on an empty board', () => {
    expect(availableColumns(EMPTY_BOARD())).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
  it('omits a full column', () => {
    let board = EMPTY_BOARD();
    for (let i = 0; i < ROWS; i++) {
      board = dropPiece(board, 4, 'red')!.board;
    }
    expect(availableColumns(board)).toEqual([0, 1, 2, 3, 5, 6]);
  });
});

describe('evaluate', () => {
  it('returns null while the board has no alignment and is not full', () => {
    expect(evaluate(EMPTY_BOARD()).winner).toBeNull();
  });

  it('detects a horizontal win', () => {
    let board = EMPTY_BOARD();
    for (const col of [0, 1, 2, 3]) {
      board = dropPiece(board, col, 'red')!.board;
    }
    const res = evaluate(board);
    expect(res.winner).toBe('red');
    expect(res.winLine).toEqual([
      [ROWS - 1, 0],
      [ROWS - 1, 1],
      [ROWS - 1, 2],
      [ROWS - 1, 3],
    ]);
  });

  it('detects a vertical win', () => {
    let board = EMPTY_BOARD();
    for (let i = 0; i < 4; i++) {
      board = dropPiece(board, 2, 'yellow')!.board;
    }
    expect(evaluate(board).winner).toBe('yellow');
  });

  it('detects a diagonal ↘ win', () => {
    let board = EMPTY_BOARD();
    const plan: Array<{ col: number; color: 'red' | 'yellow' }> = [
      { col: 1, color: 'yellow' },
      { col: 2, color: 'yellow' },
      { col: 3, color: 'yellow' },
      { col: 2, color: 'yellow' },
      { col: 3, color: 'yellow' },
      { col: 3, color: 'yellow' },
      { col: 0, color: 'red' },
      { col: 1, color: 'red' },
      { col: 2, color: 'red' },
      { col: 3, color: 'red' },
    ];
    for (const m of plan) {
      board = dropPiece(board, m.col, m.color)!.board;
    }
    const res = evaluate(board);
    expect(res.winner).toBe('red');
    expect(res.winLine).toEqual([
      [5, 0],
      [4, 1],
      [3, 2],
      [2, 3],
    ]);
  });

  it('detects a diagonal ↗ win', () => {
    let board = EMPTY_BOARD();
    const plan: Array<{ col: number; color: 'red' | 'yellow' }> = [
      { col: 2, color: 'yellow' },
      { col: 1, color: 'yellow' },
      { col: 0, color: 'yellow' },
      { col: 1, color: 'yellow' },
      { col: 0, color: 'yellow' },
      { col: 0, color: 'yellow' },
      { col: 3, color: 'red' },
      { col: 2, color: 'red' },
      { col: 1, color: 'red' },
      { col: 0, color: 'red' },
    ];
    for (const m of plan) {
      board = dropPiece(board, m.col, m.color)!.board;
    }
    expect(evaluate(board).winner).toBe('red');
  });

  it('returns draw when the board is full with no alignment', () => {
    // period-2 column pairing: RR YY RR YY RR RR Y — verified no 4-in-a-row
    const draw: Array<Array<'red' | 'yellow'>> = [
      ['red',    'red',    'yellow', 'yellow', 'red',    'red',    'yellow'],
      ['yellow', 'yellow', 'red',    'red',    'yellow', 'yellow', 'red'],
      ['red',    'red',    'yellow', 'yellow', 'red',    'red',    'yellow'],
      ['yellow', 'yellow', 'red',    'red',    'yellow', 'yellow', 'red'],
      ['red',    'red',    'yellow', 'yellow', 'red',    'red',    'yellow'],
      ['yellow', 'yellow', 'red',    'red',    'yellow', 'yellow', 'red'],
    ];
    expect(evaluate(draw).winner).toBe('draw');
  });
});
