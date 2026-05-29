import type { BestOf } from '@tabswitch/types';

/** Connect 4 only supports BO1 and BO3 because rounds are long. */
export const CONNECT4_BEST_OF_OPTIONS: readonly BestOf[] = [1, 3];

/** Sentinel player ID for the AI seat. */
export const AI_PLAYER_ID = '__ai__';

export const CONNECT4_EVENTS = {
  Move: 'move',
  SettingsUpdate: 'settings:update',
} as const;

export const CONNECT4_SERVER_EVENTS = {
  Moved: 'moved',
  RoundOver: 'round:over',
  RoundStart: 'round:start',
  MatchOver: 'match:over',
} as const;
