import type { Board, Mark } from './state.js';
import { evaluate, otherMark } from './rules.js';

/** Sentinel playerId for the AI seat. Treated as "no user" by the lobby. */
export const AI_PLAYER_ID = '__ai__';

interface Move {
  row: number;
  col: number;
}

const CORNERS: readonly Move[] = [
  { row: 0, col: 0 },
  { row: 0, col: 2 },
  { row: 2, col: 0 },
  { row: 2, col: 2 },
];

const EDGES: readonly Move[] = [
  { row: 0, col: 1 },
  { row: 1, col: 0 },
  { row: 1, col: 2 },
  { row: 2, col: 1 },
];

const CENTER: Move = { row: 1, col: 1 };

function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]) as unknown as Board;
}

function emptyCells(board: Board): Move[] {
  const out: Move[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (board[r]?.[c] === null) out.push({ row: r, col: c });
    }
  }
  return out;
}

function isEmpty(board: Board, m: Move): boolean {
  return board[m.row]?.[m.col] === null;
}

function pickRandom<T>(arr: readonly T[]): T | null {
  if (arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)] ?? null;
}

/**
 * Decent (not perfect) TicTacToe opponent. Picks the first applicable rule:
 *   1. Win if a winning move is available.
 *   2. Block the opponent's immediate win.
 *   3. Take the center if free.
 *   4. Take a random free corner.
 *   5. Take a random free edge.
 * Returns null only if the board has no empty cell (caller should never ask).
 */
export function chooseAiMove(board: Board, aiMark: Mark): Move | null {
  const empties = emptyCells(board);
  if (empties.length === 0) return null;

  // 1. Win if possible
  for (const m of empties) {
    const next = cloneBoard(board) as unknown as Array<Array<Mark | null>>;
    next[m.row]![m.col] = aiMark;
    if (evaluate(next as unknown as Board).winner === aiMark) return m;
  }

  // 2. Block opponent
  const opp = otherMark(aiMark);
  for (const m of empties) {
    const next = cloneBoard(board) as unknown as Array<Array<Mark | null>>;
    next[m.row]![m.col] = opp;
    if (evaluate(next as unknown as Board).winner === opp) return m;
  }

  // 3. Center
  if (isEmpty(board, CENTER)) return CENTER;

  // 4. Random free corner
  const freeCorners = CORNERS.filter((m) => isEmpty(board, m));
  const corner = pickRandom(freeCorners);
  if (corner) return corner;

  // 5. Random free edge (anything else)
  const freeEdges = EDGES.filter((m) => isEmpty(board, m));
  const edge = pickRandom(freeEdges);
  if (edge) return edge;

  // Fallback (shouldn't happen given the empties check above)
  return pickRandom(empties);
}
