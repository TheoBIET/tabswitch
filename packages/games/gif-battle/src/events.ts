/**
 * GIF Battle event schemas. These are GAME-SPECIFIC — they ride on the generic
 * `game:action` channel from @tabswitch/types.
 */
import { z } from 'zod';
import {
  PICK_SECONDS_OPTIONS,
  REACTION_EMOJIS,
  ROUNDS_OPTIONS,
  VOTE_SECONDS_OPTIONS,
} from './constants.js';
import type { GifBattleSettings } from './state.js';

export const RoomSettingsSchema = z.object({
  rounds: z.number().int().refine((n) => (ROUNDS_OPTIONS as readonly number[]).includes(n)),
  pickSeconds: z.number().int().refine((n) => (PICK_SECONDS_OPTIONS as readonly number[]).includes(n)),
  voteSeconds: z.number().int().refine((n) => (VOTE_SECONDS_OPTIONS as readonly number[]).includes(n)),
  mode: z.enum(['classic', 'reverse', 'speed', 'boss']),
  locale: z.enum(['fr', 'en']),
  gifRating: z.enum(['g', 'pg', 'pg13']),
}) satisfies z.ZodType<GifBattleSettings>;

export const RoomSettingsPartialSchema = RoomSettingsSchema.partial();

export const RoundSubmitSchema = z.object({
  gifId: z.string().min(1).max(128),
  gifUrl: z.string().url().max(2048),
  previewUrl: z.string().url().max(2048),
  width: z.number().int().positive().max(2400),
  height: z.number().int().positive().max(2400),
});

export const RoundVoteSchema = z.object({
  submissionId: z.string().min(1),
});

export const ReactionSchema = z.object({
  submissionId: z.string().min(1),
  emoji: z.enum(REACTION_EMOJIS),
});

export type RoomSettingsInput = z.infer<typeof RoomSettingsSchema>;
export type RoomSettingsPartialInput = z.infer<typeof RoomSettingsPartialSchema>;
export type RoundSubmitInput = z.infer<typeof RoundSubmitSchema>;
export type RoundVoteInput = z.infer<typeof RoundVoteSchema>;
export type ReactionInput = z.infer<typeof ReactionSchema>;

/** Client → server event names (used as `game:action.event`). */
export const GIF_BATTLE_EVENTS = {
  RoundSubmit: 'round:submit',
  RoundVote: 'round:vote',
  RoundUnvote: 'round:unvote',
  ReactionSend: 'reaction:send',
  SettingsUpdate: 'settings:update',
} as const;

/** Server → client event names (used as `game:event.event`). */
export const GIF_BATTLE_SERVER_EVENTS = {
  RoundStarted: 'round:started',
  RoundSubmissionCount: 'round:submission:count',
  RoundSubmissionAck: 'round:submission:ack',
  RoundPreReveal: 'round:pre_reveal',
  RoundRevealing: 'round:revealing',
  RoundVotingStart: 'round:voting:start',
  RoundVoteCount: 'round:vote:count',
  RoundResults: 'round:results',
  ReactionBroadcast: 'reaction:broadcast',
  GameEnded: 'game:ended',
  SettingsUpdated: 'settings:updated',
} as const;
