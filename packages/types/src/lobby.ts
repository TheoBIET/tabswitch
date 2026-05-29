/**
 * Generic lobby model. Everything in this file is game-agnostic.
 * Game-specific state lives inside each game's `GameRoom`.
 */

export type RoomCode = string;
export type PlayerId = string;

/** Coarse lifecycle of a room from the server/lobby perspective. */
export type RoomStatus = 'LOBBY' | 'PLAYING' | 'ENDED';

export interface LobbyPlayer {
  id: PlayerId;
  nickname: string;
  avatarSeed: string;
  isHost: boolean;
  isConnected: boolean;
  isSpectator: boolean;
  joinedAt: number;
  /** Populated at join from socket.data.userId, when the player is authenticated. */
  userId?: string;
}

export interface LobbyRoom {
  code: RoomCode;
  gameType: string;
  rev: number;
  createdAt: number;
  hostId: PlayerId;
  status: RoomStatus;
  players: LobbyPlayer[];
  spectators: LobbyPlayer[];
}

/** Lightweight player shape we expose to clients (no joinedAt internals). */
export type PublicPlayer = Pick<
  LobbyPlayer,
  'id' | 'nickname' | 'avatarSeed' | 'isHost' | 'isConnected' | 'isSpectator'
>;

export interface LobbySnapshot {
  room: LobbyRoom;
  /** Game-specific state, opaque to lobby. Filled in by `GameRoom.getStateFor`. */
  gameState: unknown;
  you: {
    playerId: PlayerId;
    isHost: boolean;
    isSpectator: boolean;
  };
  serverTime: number;
}

export interface ChatMessage {
  id: string;
  fromPlayerId: PlayerId | 'system';
  nickname: string;
  text: string;
  at: number;
}
