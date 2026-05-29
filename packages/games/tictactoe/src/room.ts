import { z } from 'zod';
import {
  applyRound,
  isMatchOver,
  matchWinner,
  type BestOf,
  type GameContext,
  type GameHandlerResult,
  type GameRoom,
  type RoundOutcome,
} from '@tabswitch/types';
import {
  EMPTY_BOARD,
  TICTACTOE_EVENTS,
  TICTACTOE_SERVER_EVENTS,
  type Mark,
  type TicTacToeClientView,
  type TicTacToeState,
} from './state.js';
import { applyMove, evaluate, isCellEmpty, isInBounds, otherMark } from './rules.js';
import { deriveOutcomes } from './outcomes.js';
import { AI_PLAYER_ID, chooseAiMove } from './ai.js';

const MoveSchema = z.object({
  row: z.number().int().min(0).max(2),
  col: z.number().int().min(0).max(2),
});

const SettingsSchema = z.object({
  bestOf: z.union([z.literal(1), z.literal(3), z.literal(5), z.literal(7)]),
});

const AI_THINK_MS = 600;
const INTER_ROUND_MS = 2000;

const SETTINGS_UPDATE_EVENT = 'settings:update';

export class TicTacToeRoom implements GameRoom<TicTacToeClientView> {
  readonly gameType = 'tictactoe';
  readonly roomCode: string;

  private state: TicTacToeState;
  private aiTimer: ReturnType<typeof setTimeout> | null = null;
  private nextRoundTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly ctx: GameContext) {
    this.roomCode = ctx.roomCode;
    this.state = {
      board: EMPTY_BOARD(),
      currentPlayer: 'X',
      assignments: { X: null, O: null },
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
      const mark = this.markFor(playerId);
      if (mark) {
        const winnerMark = otherMark(mark);
        this.state.winner = winnerMark;
        this.state.matchOutcome = winnerMark === 'X' ? 'p1' : 'p2';
        this.cancelTimers();
        this.ctx.broadcast(TICTACTOE_SERVER_EVENTS.GameOver, {
          winner: winnerMark,
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

  getStateFor(playerId: string): TicTacToeClientView {
    const mark = this.markFor(playerId);
    return {
      board: this.state.board.map((row) => [...row]) as unknown as TicTacToeClientView['board'],
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
        mark,
        isYourTurn:
          mark != null &&
          mark === this.state.currentPlayer &&
          this.state.matchOutcome === null &&
          this.state.winner === null,
      },
    };
  }

  handleEvent(playerId: string, event: string, payload: unknown): GameHandlerResult {
    switch (event) {
      case TICTACTOE_EVENTS.Move:
        return this.handleMove(playerId, payload);
      case SETTINGS_UPDATE_EVENT:
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
    this.state.bestOf = parsed.data.bestOf as BestOf;
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
    if (!parsed.success) return { ok: false, code: 'BAD_INPUT', message: 'Coup invalide.' };
    const mark = this.markFor(playerId);
    if (!mark) return { ok: false, code: 'NOT_PLAYING', message: 'Tu es spectateur.' };
    if (mark !== this.state.currentPlayer) {
      return { ok: false, code: 'NOT_YOUR_TURN', message: "Ce n'est pas ton tour." };
    }
    const { row, col } = parsed.data;
    if (!isInBounds(row, col)) {
      return { ok: false, code: 'OUT_OF_BOUNDS', message: 'Hors plateau.' };
    }
    if (!isCellEmpty(this.state.board, row, col)) {
      return { ok: false, code: 'CELL_TAKEN', message: 'Case déjà prise.' };
    }
    this.applyMoveAndProgress(mark, row, col);
    return { ok: true };
  }

  private applyMoveAndProgress(mark: Mark, row: number, col: number): void {
    applyMove(this.state.board, row, col, mark);
    this.ctx.broadcast(TICTACTOE_SERVER_EVENTS.Moved, { row, col, mark });
    const evald = evaluate(this.state.board);
    if (evald.winner !== null) {
      this.state.winner = evald.winner;
      this.state.winLine = evald.winLine;
      this.ctx.broadcast(TICTACTOE_SERVER_EVENTS.GameOver, {
        winner: evald.winner,
        winLine: evald.winLine,
      });
      const outcome: RoundOutcome =
        evald.winner === 'draw' ? 'draw' : evald.winner === 'X' ? 'p1' : 'p2';
      this.state.matchScore = applyRound(this.state.matchScore, outcome);
      if (isMatchOver(this.state.matchScore, this.state.bestOf)) {
        this.state.matchOutcome = matchWinner(this.state.matchScore);
        const outcomes = deriveOutcomes(this.state);
        if (outcomes) this.ctx.endGame(outcomes);
      } else {
        this.scheduleNextRound();
      }
    } else {
      this.state.currentPlayer = otherMark(mark);
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
      this.state.currentPlayer = 'X';
      this.state.roundNumber++;
      this.ctx.broadcastState();
      this.scheduleAiIfTurn();
    }, INTER_ROUND_MS);
  }

  private scheduleAiIfTurn(): void {
    if (this.state.matchOutcome !== null || this.state.winner !== null) return;
    const currentSeat =
      this.state.currentPlayer === 'X' ? this.state.assignments.X : this.state.assignments.O;
    if (currentSeat !== AI_PLAYER_ID) return;
    this.cancelAiTimer();
    this.aiTimer = setTimeout(() => {
      this.aiTimer = null;
      try {
        this.playAiMove();
      } catch (err) {
        console.error('[TicTacToeRoom] AI move failed:', err);
      }
    }, AI_THINK_MS);
  }

  private playAiMove(): void {
    if (this.state.matchOutcome !== null || this.state.winner !== null) return;
    const aiMark: Mark = this.state.currentPlayer;
    const move = chooseAiMove(this.state.board, aiMark);
    if (!move) return;
    this.applyMoveAndProgress(aiMark, move.row, move.col);
  }

  private startMatch(): void {
    const lobby = this.ctx.listPlayers().filter((p) => !p.isSpectator);
    const x = lobby[0]?.id ?? null;
    let o = lobby[1]?.id ?? null;
    if (x && !o) o = AI_PLAYER_ID;
    this.cancelTimers();
    this.state = {
      board: EMPTY_BOARD(),
      currentPlayer: 'X',
      assignments: { X: x, O: o },
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

  private markFor(playerId: string): Mark | null {
    if (this.state.assignments.X === playerId) return 'X';
    if (this.state.assignments.O === playerId) return 'O';
    return null;
  }
}
