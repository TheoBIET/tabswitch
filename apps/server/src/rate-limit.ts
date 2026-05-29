import type { Socket } from 'socket.io';
import { RATE_LIMITS } from '@tabswitch/types';

interface BucketState {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Map<string, BucketState>>();

/** Sliding-window per (socket, eventName) counter. In-memory; OK for single-replica MVP. */
export function consume(socket: Socket, event: string, limitPerMin: number): boolean {
  const sid = socket.id;
  let perEvent = buckets.get(sid);
  if (!perEvent) {
    perEvent = new Map();
    buckets.set(sid, perEvent);
  }
  const now = Date.now();
  const state = perEvent.get(event) ?? { count: 0, windowStart: now };
  if (now - state.windowStart > 60_000) {
    state.count = 0;
    state.windowStart = now;
  }
  state.count++;
  perEvent.set(event, state);
  return state.count <= limitPerMin;
}

export function cleanupSocket(socketId: string): void {
  buckets.delete(socketId);
}

export const LIMITS = {
  default: RATE_LIMITS.perSocketPerMinute,
  gameAction: RATE_LIMITS.gameActionPerMinute,
  chat: RATE_LIMITS.chatPerMinute,
} as const;
