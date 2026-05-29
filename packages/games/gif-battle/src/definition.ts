import type { GameDefinition } from '@tabswitch/types';
import { MAX_PLAYERS, MIN_PLAYERS_TO_START } from './constants.js';
import { GifBattleRoom } from './room.js';
import type { GifBattleClientView } from './state.js';

export const gifBattleDefinition: GameDefinition<GifBattleClientView> = {
  gameType: 'gif-battle',
  name: 'GIF Battle',
  tagline: 'Le party game où ton meme parle pour toi.',
  minPlayers: MIN_PLAYERS_TO_START,
  maxPlayers: MAX_PLAYERS,
  spectatorsAllowed: true,
  create: (ctx) => new GifBattleRoom(ctx),
};

export default gifBattleDefinition;
