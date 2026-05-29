import type { GameDefinition } from '@tabswitch/types';
import { connect4Definition } from '@tabswitch/connect4';
import { gifBattleDefinition } from '@tabswitch/gif-battle';
import { plateauDefinition } from '@tabswitch/plateau';
import { rpsDefinition } from '@tabswitch/rps';
import { ticTacToeDefinition } from '@tabswitch/tictactoe';

/**
 * To register a new game:
 *   1. Add a workspace dep to apps/server/package.json
 *   2. Import its `GameDefinition` here
 *   3. Add it to the array below
 */
const ALL_GAMES: readonly GameDefinition[] = [
  gifBattleDefinition,
  ticTacToeDefinition,
  connect4Definition,
  rpsDefinition,
  plateauDefinition,
];

const byType = new Map<string, GameDefinition>(ALL_GAMES.map((g) => [g.gameType, g]));

export function getGameDefinition(gameType: string): GameDefinition | undefined {
  return byType.get(gameType);
}

export function listGameDefinitions(): readonly GameDefinition[] {
  return ALL_GAMES;
}
