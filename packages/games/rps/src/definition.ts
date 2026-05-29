import type { GameDefinition } from '@tabswitch/types';
import { RpsRoom } from './room.js';
import type { RpsClientView } from './state.js';

export const rpsDefinition: GameDefinition<RpsClientView> = {
  gameType: 'rps',
  name: 'Pierre-Feuille-Ciseaux',
  tagline: 'Le classique en best-of. Première à 3 victoires gagne.',
  minPlayers: 1, // solo allowed: empty seat is filled by a random AI
  maxPlayers: 2,
  spectatorsAllowed: true,
  create: (ctx) => new RpsRoom(ctx),
};

export default rpsDefinition;
