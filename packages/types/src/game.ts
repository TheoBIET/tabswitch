/**
 * Core contract every game must implement.
 *
 * A `GameRoom` is a long-lived object held by the server in a Map<roomCode, GameRoom>.
 * It owns the game-specific state. The server only knows about the generic lobby
 * (players, host, chat) and forwards gameplay events through `handleEvent`.
 *
 * To add a new game:
 *   1. Create `packages/games/<your-game>`.
 *   2. Export a `GameDefinition` (see below).
 *   3. Register it in `apps/server/src/games/registry.ts`.
 *   4. (Optional) Provide a React UI in `apps/web/components/games/<your-game>`.
 */
export interface GameRoom<TState = unknown> {
  readonly roomCode: string;
  readonly gameType: string;

  /** Called when a player joins (after lobby has accepted them). */
  onJoin(playerId: string): void | Promise<void>;

  /** Called when a player leaves or is kicked. */
  onLeave(playerId: string, reason: 'leave' | 'kick' | 'timeout'): void | Promise<void>;

  /**
   * Called when the host starts the game (status moves LOBBY → PLAYING).
   * Use this to initialize game state, schedule timers, etc.
   */
  onStart(): void | Promise<void>;

  /**
   * Called when the game ends (status moves PLAYING → ENDED).
   * Use this to clean up timers, finalize scores, etc.
   */
  onEnd(): void | Promise<void>;

  /**
   * Handle a gameplay event from a specific player.
   * Return value is forwarded to the client as the ack envelope.
   */
  handleEvent(
    playerId: string,
    event: string,
    payload: unknown,
  ): Promise<GameHandlerResult> | GameHandlerResult;

  /**
   * Per-recipient snapshot of the game state (allows hiding info from some players,
   * e.g. opponent's hand of cards, GIF Battle's submission owners during voting).
   */
  getStateFor(playerId: string): TState;

  /** Optional teardown hook called when the room is GCed. */
  dispose?(): void | Promise<void>;
}

export type GameHandlerResult =
  | { ok: true; data?: Record<string, unknown> }
  | { ok: false; code: string; message: string; retryable?: boolean };

export type GameOutcome = 'won' | 'lost' | 'draw';
export type GameOutcomes = Record<string, GameOutcome>;

/**
 * Side-channel exposed to a `GameRoom`. The server creates and passes this in
 * when constructing the room. Games use it to push state updates without
 * coupling to socket.io.
 */
export interface GameContext {
  readonly roomCode: string;

  /** Broadcast a game-specific event to every player + spectator in the room. */
  broadcast(event: string, payload: unknown): void;

  /** Send a game-specific event to one player. */
  emitTo(playerId: string, event: string, payload: unknown): void;

  /**
   * Tell every player to re-pull state via `getStateFor`.
   * Cheaper than passing the full state through the broadcast channel for
   * games where state is heterogeneous per-player.
   */
  broadcastState(): void;

  /**
   * End the game cleanly. The server will move room status to ENDED and,
   * for each playerId present in `outcomes`, write a GameSession row for
   * the matching authenticated user (if any). Pass nothing if the game
   * type has no concept of per-player outcomes.
   */
  endGame(outcomes?: GameOutcomes): void;

  /** Convenience access to current lobby players for game logic. */
  listPlayers(): readonly LobbyPlayerLite[];
}

export interface LobbyPlayerLite {
  readonly id: string;
  readonly nickname: string;
  readonly isSpectator: boolean;
  readonly isConnected: boolean;
}

/**
 * Static description of a game. Each game package exports one of these.
 * It's the entry-point the registry uses to spin up rooms.
 */
export interface GameDefinition<TState = unknown> {
  /** Stable identifier used in URLs and the WS protocol. Kebab-case. */
  readonly gameType: string;

  /** Display name in the lobby. */
  readonly name: string;

  /** Short pitch shown on the game card. */
  readonly tagline: string;

  /** Minimum players required to call `onStart()`. */
  readonly minPlayers: number;

  /** Maximum active players. */
  readonly maxPlayers: number;

  /** Whether spectators can join past LOBBY. */
  readonly spectatorsAllowed: boolean;

  /** Build a fresh game room. */
  create(ctx: GameContext): GameRoom<TState>;
}
