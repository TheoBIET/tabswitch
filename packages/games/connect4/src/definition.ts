import type { GameDefinition } from '@tabswitch/types';
import { Connect4Room } from './room.js';
import type { Connect4ClientView } from './state.js';

export const connect4Definition: GameDefinition<Connect4ClientView> = {
  gameType: 'connect4',
  name: 'Connect 4',
  tagline: 'Aligne 4 jetons. Joue avec un pote ou contre l’IA.',
  minPlayers: 1,
  maxPlayers: 2,
  spectatorsAllowed: true,
  create: (ctx) => new Connect4Room(ctx),
};

export default connect4Definition;
