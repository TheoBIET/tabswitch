import { availableColumns, dropPiece, evaluate } from './rules.js';
import type { Board, Color } from './state.js';

const CENTER = 3;

function opponent(color: Color): Color {
  return color === 'red' ? 'yellow' : 'red';
}

function pickRandom<T>(arr: readonly T[]): T | null {
  if (arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)] ?? null;
}

/**
 * Heuristic Connect 4 opponent. In order:
 *   1. Win if a winning column is available.
 *   2. Block the opponent's immediate winning column.
 *   3. Avoid handing the opponent a winning column on their next move.
 *   4. Prefer the centre column.
 *   5. Random among remaining columns.
 *
 * Returns null only when no column is available.
 */
export function chooseAiMove(board: Board, aiColor: Color): number | null {
  const cols = availableColumns(board);
  if (cols.length === 0) return null;

  // 1. Win if possible
  for (const c of cols) {
    const drop = dropPiece(board, c, aiColor);
    if (drop && evaluate(drop.board).winner === aiColor) return c;
  }

  // 2. Block opponent
  const opp = opponent(aiColor);
  for (const c of cols) {
    const drop = dropPiece(board, c, opp);
    if (drop && evaluate(drop.board).winner === opp) return c;
  }

  // 3. Avoid suicide moves (gift-wrapping a winning move to the opponent)
  const safeCols: number[] = [];
  for (const c of cols) {
    const drop = dropPiece(board, c, aiColor);
    if (!drop) continue;
    const opponentCanWin = availableColumns(drop.board).some((nc) => {
      const oppDrop = dropPiece(drop.board, nc, opp);
      return oppDrop != null && evaluate(oppDrop.board).winner === opp;
    });
    if (!opponentCanWin) safeCols.push(c);
  }

  const pool = safeCols.length > 0 ? safeCols : cols;

  // 4. Centre preference
  if (pool.includes(CENTER)) return CENTER;

  // 5. Random fallback
  return pickRandom(pool);
}
