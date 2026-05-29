'use client';

import { io as createSocket, type Socket } from 'socket.io-client';
import type {
  Ack,
  ClientToServerEvents,
  GameActionInput,
  ServerToClientEvents,
} from '@tabswitch/types';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

function getServerUrl(): string {
  return process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';
}

export function getSocket(): AppSocket {
  if (socket) return socket;
  socket = createSocket(getServerUrl(), {
    withCredentials: true,
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5_000,
  });
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// ============ Game action helpers ============

/**
 * Type-safe wrapper around `game:action`. Each game can expose a small typed
 * helper module that ultimately calls this.
 *
 * Example: `gameAction(socket, 'move', { row, col })` for TicTacToe.
 */
export function gameAction(
  socket: AppSocket,
  event: GameActionInput['event'],
  payload: GameActionInput['payload'],
): Promise<Ack<Record<string, unknown> | undefined>> {
  return new Promise((resolve) => {
    socket.emit('game:action', { event, payload }, (ack) => resolve(ack));
  });
}

/**
 * Subscribe to a specific game event. Returns an unsubscribe function.
 *
 * Example:
 *   const off = onGameEvent(socket, 'moved', (payload) => {...});
 */
export function onGameEvent<T = unknown>(
  socket: AppSocket,
  event: string,
  handler: (payload: T) => void,
): () => void {
  const listener = (msg: { event: string; payload: unknown }) => {
    if (msg.event === event) handler(msg.payload as T);
  };
  socket.on('game:event', listener);
  return () => {
    socket.off('game:event', listener);
  };
}
