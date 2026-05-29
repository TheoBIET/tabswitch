import type { GameDefinition } from '@tabswitch/types';
import { TicTacToeRoom } from './room.js';
import type { TicTacToeClientView } from './state.js';

export const ticTacToeDefinition: GameDefinition<TicTacToeClientView> = {
  gameType: 'tictactoe',
  name: 'Tic-Tac-Toe',
  tagline: 'Le classique. Trois en ligne pour gagner.',
  minPlayers: 1, // solo allowed: empty seat is filled by the AI
  maxPlayers: 2,
  spectatorsAllowed: true,
  create: (ctx) => new TicTacToeRoom(ctx),
};

export default ticTacToeDefinition;
