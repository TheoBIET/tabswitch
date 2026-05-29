import type { BestOf } from '@tabswitch/types';

export const RPS_BEST_OF_OPTIONS: readonly BestOf[] = [1, 3, 5, 7];

export const PICK_DEADLINE_MS = 10_000;
export const REVEAL_MS = 1500;
export const INTER_ROUND_MS = 1000;
export const AI_THINK_MS = 800;

/** Sentinel playerId for the AI seat (random opponent in solo mode). */
export const AI_PLAYER_ID = '__ai__';

export const RPS_EVENTS = {
  Pick: 'pick',
  SettingsUpdate: 'settings:update',
} as const;

export const RPS_SERVER_EVENTS = {
  Picked: 'picked',
  RoundRevealed: 'round:revealed',
  RoundStart: 'round:start',
  MatchOver: 'match:over',
} as const;
