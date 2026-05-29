import type { Board, Mark, MutableBoard, Outcome, WinLine } from './state.js';

const WIN_LINES: readonly WinLine[] = [
  // rows
  [[0, 0], [0, 1], [0, 2]],
  [[1, 0], [1, 1], [1, 2]],
  [[2, 0], [2, 1], [2, 2]],
  // cols
  [[0, 0], [1, 0], [2, 0]],
  [[0, 1], [1, 1], [2, 1]],
  [[0, 2], [1, 2], [2, 2]],
  // diagonals
  [[0, 0], [1, 1], [2, 2]],
  [[0, 2], [1, 1], [2, 0]],
];

export function isInBounds(row: number, col: number): boolean {
  return Number.isInteger(row) && Number.isInteger(col) && row >= 0 && row < 3 && col >= 0 && col < 3;
}

export function isCellEmpty(board: Board, row: number, col: number): boolean {
  return board[row]?.[col] === null;
}

export function applyMove(board: MutableBoard, row: number, col: number, mark: Mark): MutableBoard {
  board[row]![col] = mark;
  return board;
}

/** Detect winner and the winning line, or 'draw', or null if game is still on. */
export function evaluate(board: Board): { winner: Outcome; winLine: WinLine | null } {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    const va = board[a[0]]?.[a[1]];
    const vb = board[b[0]]?.[b[1]];
    const vc = board[c[0]]?.[c[1]];
    if (va && va === vb && vb === vc) {
      return { winner: va, winLine: line };
    }
  }
  // draw if no empty cell
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (board[r]?.[c] === null) return { winner: null, winLine: null };
    }
  }
  return { winner: 'draw', winLine: null };
}

export function otherMark(mark: Mark): Mark {
  return mark === 'X' ? 'O' : 'X';
}
