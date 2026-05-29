import { z } from 'zod';
import {
  applyRound,
  BEST_OF_OPTIONS,
  isMatchOver,
  matchWinner,
  type GameContext,
  type GameHandlerResult,
  type GameRoom,
  type RoundOutcome,
} from '@tabswitch/types';
import {
  AI_PLAYER_ID,
  CONNECT4_BEST_OF_OPTIONS,
  CONNECT4_EVENTS,
  CONNECT4_SERVER_EVENTS,
} from './constants.js';
import {
  EMPTY_BOARD,
  type Color,
  type Connect4ClientView,
  type Connect4State,
} from './state.js';
import { dropPiece, evaluate } from './rules.js';
import { chooseAiMove } from './ai.js';
import { deriveOutcomes } from './outcomes.js';

const MoveSchema = z.object({
  col: z.number().int().min(0).max(6),
});

const SettingsSchema = z.object({
  bestOf: z.union([z.literal(1), z.literal(3)]),
});

const AI_THINK_MS = 600;
const INTER_ROUND_MS = 2000;

function opponentColor(c: Color): Color {
  return c === 'red' ? 'yellow' : 'red';
}

export class Connect4Room implements GameRoom<Connect4ClientView> {
  readonly gameType = 'connect4';
  readonly roomCode: string;

  private state: Connect4State;
  private aiTimer: ReturnType<typeof setTimeout> | null = null;
  private nextRoundTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly ctx: GameContext) {
    this.roomCode = ctx.roomCode;
    this.state = {
      board: EMPTY_BOARD(),
      currentPlayer: 'red',
      assignments: { red: null, yellow: null },
      winner: null,
      winLine: null,
      matchNumber: 0,
      roundNumber: 0,
      bestOf: 1,
      matchScore: { p1: 0, p2: 0, draws: 0 },
      matchOutcome: null,
    };
  }

  onJoin(_playerId: string): void {
    this.ctx.broadcastState();
  }

  onLeave(playerId: string, _reason: 'leave' | 'kick' | 'timeout'): void {
    if (this.state.matchOutcome === null && this.state.matchNumber > 0) {
      const color = this.colorFor(playerId);
      if (color) {
        const winnerColor = opponentColor(color);
        this.state.matchOutcome = winnerColor === 'red' ? 'p1' : 'p2';
        this.state.winner = winnerColor;
        this.cancelTimers();
        this.ctx.broadcast(CONNECT4_SERVER_EVENTS.MatchOver, {
          winner: this.state.matchOutcome,
          finalScore: this.state.matchScore,
          reason: 'opponent-left',
        });
        const outcomes = deriveOutcomes(this.state);
        if (outcomes) this.ctx.endGame(outcomes);
      }
    }
    this.ctx.broadcastState();
  }

  onStart(): void {
    this.startMatch();
  }

  onEnd(): void {
    this.cancelTimers();
  }

  dispose(): void {
    this.cancelTimers();
  }

  getStateFor(playerId: string): Connect4ClientView {
    const color = this.colorFor(playerId);
    return {
      board: this.state.board.map((row) => [...row]),
      currentPlayer: this.state.currentPlayer,
      assignments: this.state.assignments,
      winner: this.state.winner,
      winLine: this.state.winLine,
      matchNumber: this.state.matchNumber,
      roundNumber: this.state.roundNumber,
      bestOf: this.state.bestOf,
      matchScore: this.state.matchScore,
      matchOutcome: this.state.matchOutcome,
      you: {
        color,
        isYourTurn:
          color != null &&
          color === this.state.currentPlayer &&
          this.state.matchOutcome === null &&
          this.state.winner === null,
      },
    };
  }

  handleEvent(playerId: string, event: string, payload: unknown): GameHandlerResult {
    switch (event) {
      case CONNECT4_EVENTS.Move:
        return this.handleMove(playerId, payload);
      case CONNECT4_EVENTS.SettingsUpdate:
        return this.handleSettings(payload);
      default:
        return { ok: false, code: 'UNKNOWN_EVENT', message: `Unknown event: ${event}` };
    }
  }

  private handleSettings(payload: unknown): GameHandlerResult {
    if (this.state.matchNumber !== 0) {
      return { ok: false, code: 'MATCH_RUNNING', message: 'Settings figés.' };
    }
    const parsed = SettingsSchema.safeParse(payload);
    if (!parsed.success) return { ok: false, code: 'BAD_INPUT', message: 'BO invalide.' };
    if (!CONNECT4_BEST_OF_OPTIONS.includes(parsed.data.bestOf)) {
      return { ok: false, code: 'BAD_INPUT', message: 'BO non supporté.' };
    }
    this.state.bestOf = parsed.data.bestOf;
    this.ctx.broadcastState();
    return { ok: true };
  }

  private handleMove(playerId: string, payload: unknown): GameHandlerResult {
    if (this.state.matchOutcome !== null) {
      return { ok: false, code: 'MATCH_OVER', message: 'Match terminé.' };
    }
    if (this.state.winner !== null) {
      return { ok: false, code: 'ROUND_OVER', message: 'Manche terminée.' };
    }
    const parsed = MoveSchema.safeParse(payload);
    if (!parsed.success) return { ok: false, code: 'BAD_INPUT', message: 'Colonne invalide.' };
    const color = this.colorFor(playerId);
    if (!color) return { ok: false, code: 'NOT_PLAYING', message: 'Tu es spectateur.' };
    if (color !== this.state.currentPlayer) {
      return { ok: false, code: 'NOT_YOUR_TURN', message: "Ce n'est pas ton tour." };
    }
    const drop = dropPiece(this.state.board, parsed.data.col, color);
    if (!drop) {
      return { ok: false, code: 'COL_FULL', message: 'Colonne pleine.' };
    }
    this.applyMoveAndProgress(drop.board, parsed.data.col, drop.row, color);
    return { ok: true };
  }

  private applyMoveAndProgress(board: Connect4State['board'], col: number, row: number, color: Color): void {
    this.state.board = board;
    this.ctx.broadcast(CONNECT4_SERVER_EVENTS.Moved, { col, row, color });
    const evald = evaluate(this.state.board);
    if (evald.winner !== null) {
      this.state.winner = evald.winner;
      this.state.winLine = evald.winLine;
      this.ctx.broadcast(CONNECT4_SERVER_EVENTS.RoundOver, {
        winner: evald.winner,
        winLine: evald.winLine,
      });
      const outcome: RoundOutcome =
        evald.winner === 'draw' ? 'draw' : evald.winner === 'red' ? 'p1' : 'p2';
      this.state.matchScore = applyRound(this.state.matchScore, outcome);
      if (isMatchOver(this.state.matchScore, this.state.bestOf)) {
        this.state.matchOutcome = matchWinner(this.state.matchScore);
        const outcomes = deriveOutcomes(this.state);
        if (outcomes) this.ctx.endGame(outcomes);
        this.ctx.broadcast(CONNECT4_SERVER_EVENTS.MatchOver, {
          winner: this.state.matchOutcome,
          finalScore: this.state.matchScore,
        });
      } else {
        this.scheduleNextRound();
      }
    } else {
      this.state.currentPlayer = opponentColor(color);
    }
    this.ctx.broadcastState();
    this.scheduleAiIfTurn();
  }

  private scheduleNextRound(): void {
    this.cancelTimers();
    this.nextRoundTimer = setTimeout(() => {
      this.nextRoundTimer = null;
      this.state.board = EMPTY_BOARD();
      this.state.winner = null;
      this.state.winLine = null;
      this.state.currentPlayer = 'red';
      this.state.roundNumber++;
      this.ctx.broadcast(CONNECT4_SERVER_EVENTS.RoundStart, { roundNumber: this.state.roundNumber });
      this.ctx.broadcastState();
      this.scheduleAiIfTurn();
    }, INTER_ROUND_MS);
  }

  private scheduleAiIfTurn(): void {
    if (this.state.matchOutcome !== null || this.state.winner !== null) return;
    const currentSeat =
      this.state.currentPlayer === 'red'
        ? this.state.assignments.red
        : this.state.assignments.yellow;
    if (currentSeat !== AI_PLAYER_ID) return;
    this.cancelAiTimer();
    this.aiTimer = setTimeout(() => {
      this.aiTimer = null;
      try {
        this.playAiMove();
      } catch (err) {
        console.error('[Connect4Room] AI move failed:', err);
      }
    }, AI_THINK_MS);
  }

  private playAiMove(): void {
    if (this.state.matchOutcome !== null || this.state.winner !== null) return;
    const aiColor: Color = this.state.currentPlayer;
    const col = chooseAiMove(this.state.board, aiColor);
    if (col === null) return;
    const drop = dropPiece(this.state.board, col, aiColor);
    if (!drop) return;
    this.applyMoveAndProgress(drop.board, col, drop.row, aiColor);
  }

  private startMatch(): void {
    const lobby = this.ctx.listPlayers().filter((p) => !p.isSpectator);
    const red = lobby[0]?.id ?? null;
    let yellow = lobby[1]?.id ?? null;
    if (red && !yellow) yellow = AI_PLAYER_ID;
    this.cancelTimers();
    this.state = {
      board: EMPTY_BOARD(),
      currentPlayer: 'red',
      assignments: { red, yellow },
      winner: null,
      winLine: null,
      matchNumber: this.state.matchNumber + 1,
      roundNumber: 1,
      bestOf: this.state.bestOf,
      matchScore: { p1: 0, p2: 0, draws: 0 },
      matchOutcome: null,
    };
    this.ctx.broadcastState();
    this.scheduleAiIfTurn();
  }

  private cancelTimers(): void {
    this.cancelAiTimer();
    if (this.nextRoundTimer) {
      clearTimeout(this.nextRoundTimer);
      this.nextRoundTimer = null;
    }
  }

  private cancelAiTimer(): void {
    if (this.aiTimer) {
      clearTimeout(this.aiTimer);
      this.aiTimer = null;
    }
  }

  private colorFor(playerId: string): Color | null {
    if (this.state.assignments.red === playerId) return 'red';
    if (this.state.assignments.yellow === playerId) return 'yellow';
    return null;
  }
}

// Re-export side-marker so BEST_OF_OPTIONS is reachable through the package barrel.
export const __reexport_bo = BEST_OF_OPTIONS;
