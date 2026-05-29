import { COLS, ROWS } from './state.js';
import type { Board, Color, WinLine, RoundResult } from './state.js';

function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

/**
 * Drop a piece into the given column. Returns the new board and the row the
 * piece landed on, or null if the column is full.
 */
export function dropPiece(
  board: Board,
  col: number,
  color: Color,
): { board: Board; row: number } | null {
  if (col < 0 || col >= COLS) return null;
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row]?.[col] === null) {
      const next = cloneBoard(board);
      next[row]![col] = color;
      return { board: next, row };
    }
  }
  return null;
}

export function isColumnFull(board: Board, col: number): boolean {
  return board[0]?.[col] !== null;
}

export function availableColumns(board: Board): number[] {
  const out: number[] = [];
  for (let c = 0; c < COLS; c++) if (!isColumnFull(board, c)) out.push(c);
  return out;
}

function isFull(board: Board): boolean {
  for (let c = 0; c < COLS; c++) if (!isColumnFull(board, c)) return false;
  return true;
}

const DIRECTIONS: Array<readonly [number, number]> = [
  [0, 1],  // horizontal →
  [1, 0],  // vertical ↓
  [1, 1],  // diagonal ↘
  [-1, 1], // diagonal ↗
];

/**
 * Detect a 4-in-a-row alignment. Returns the winner colour + the four
 * coordinates of the alignment, or 'draw' if the board is full, or null
 * while the game is still on.
 */
export function evaluate(board: Board): { winner: RoundResult; winLine: WinLine | null } {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = board[r]?.[c];
      if (cell === null || cell === undefined) continue;
      for (const [dr, dc] of DIRECTIONS) {
        const line: Array<readonly [number, number]> = [[r, c]];
        let ok = true;
        for (let k = 1; k < 4; k++) {
          const nr = r + dr * k;
          const nc = c + dc * k;
          if (board[nr]?.[nc] !== cell) {
            ok = false;
            break;
          }
          line.push([nr, nc]);
        }
        if (ok) {
          return {
            winner: cell as Color,
            winLine: line as unknown as WinLine,
          };
        }
      }
    }
  }
  return { winner: isFull(board) ? 'draw' : null, winLine: null };
}
