// packages/games/plateau/src/definition.ts
import type { GameDefinition } from '@tabswitch/types';
import { PlateauRoom } from './room.js';
import type { PlateauClientView } from './types.js';

export const plateauDefinition: GameDefinition<PlateauClientView> = {
  gameType: 'plateau',
  name: 'Plateau Party',
  tagline: 'Lancez les dés, traversez le plateau, remportez les défis !',
  minPlayers: 2,
  maxPlayers: 8,
  spectatorsAllowed: true,
  create: (ctx) => new PlateauRoom(ctx),
};

export default plateauDefinition;
