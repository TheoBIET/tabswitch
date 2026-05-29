import type { GifBattleState } from './state.js';

export type GameOutcome = 'won' | 'lost' | 'draw';
export type GameOutcomes = Record<string, GameOutcome>;

/**
 * Pure: turn GIF Battle's terminal state into a playerId → outcome map.
 *   - Solo top score → that player 'won', everyone else 'lost'.
 *   - Two or more tied at the top → all tied players 'draw', strictly
 *     lower scores 'lost'.
 * Spectators are excluded. Returns null while the game has not ended.
 */
export function deriveOutcomes(state: GifBattleState): GameOutcomes | null {
  if (state.status !== 'GAME_END') return null;

  const active = state.players.filter((p) => !p.isSpectator);
  const out: GameOutcomes = {};
  if (active.length === 0) return out;

  const topScore = Math.max(...active.map((p) => p.score));
  const topCount = active.filter((p) => p.score === topScore).length;

  for (const p of active) {
    if (p.score === topScore) {
      out[p.id] = topCount === 1 ? 'won' : 'draw';
    } else {
      out[p.id] = 'lost';
    }
  }
  return out;
}
