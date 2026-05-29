export const ROOM_CODE_LENGTH = 4;
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ'; // exclude I, L, O

export const NICKNAME_MIN_LENGTH = 1;
export const NICKNAME_MAX_LENGTH = 16;
export const NICKNAME_REGEX = /^[\p{L}\p{N} _\-]{1,16}$/u;

export const CHAT_MAX_LENGTH = 200;

export const MAX_SPECTATORS = 50;
export const ROOM_TTL_SECONDS = 30 * 60; // 30min inactivity → GC
export const PLAYER_DISCONNECT_GRACE_MS = 60_000;

export const RATE_LIMITS = {
  perSocketPerMinute: 60,
  perSocketBurst: 10,
  gameActionPerMinute: 30,
  chatPerMinute: 20,
  reactionPerMinute: 30,
  roomCreatePerIpPerHour: 5,
} as const;
