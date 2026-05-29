import { z } from 'zod';
import {
  applyRound,
  isMatchOver,
  matchWinner,
  type GameContext,
  type GameHandlerResult,
  type GameRoom,
} from '@tabswitch/types';
import {
  AI_PLAYER_ID,
  AI_THINK_MS,
  INTER_ROUND_MS,
  PICK_DEADLINE_MS,
  REVEAL_MS,
  RPS_BEST_OF_OPTIONS,
  RPS_EVENTS,
  RPS_SERVER_EVENTS,
} from './constants.js';
import { CHOICES, type Choice, type RpsClientView, type RpsRound, type RpsState } from './state.js';
import { roundOutcome } from './rules.js';
import { deriveOutcomes } from './outcomes.js';

const ChoiceSchema = z.object({ choice: z.enum(['rock', 'paper', 'scissors']) });

const SettingsSchema = z.object({
  bestOf: z.union([z.literal(1), z.literal(3), z.literal(5), z.literal(7)]),
});

function emptyRound(number: number, deadline: number): RpsRound {
  return { number, p1Choice: null, p2Choice: null, deadline, outcome: null };
}

export class RpsRoom implements GameRoom<RpsClientView> {
  readonly gameType = 'rps';
  readonly roomCode: string;

  private state: RpsState;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private aiTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly ctx: GameContext) {
    this.roomCode = ctx.roomCode;
    this.state = {
      status: 'WAITING',
      bestOf: 5,
      assignments: { p1: null, p2: null },
      matchScore: { p1: 0, p2: 0, draws: 0 },
      currentRound: emptyRound(0, 0),
      history: [],
      matchOutcome: null,
    };
  }

  onJoin(_playerId: string): void {
    this.ctx.broadcastState();
  }

  onLeave(playerId: string, _reason: 'leave' | 'kick' | 'timeout'): void {
    if (
      this.state.matchOutcome === null &&
      (this.state.status === 'PICKING' || this.state.status === 'REVEALING')
    ) {
      const seat = this.seatFor(playerId);
      if (seat) {
        this.state.matchOutcome = seat === 'p1' ? 'p2' : 'p1';
        this.state.status = 'MATCH_OVER';
        this.cancelAllTimers();
        const outcomes = deriveOutcomes(this.state);
        if (outcomes) this.ctx.endGame(outcomes);
        this.ctx.broadcast(RPS_SERVER_EVENTS.MatchOver, {
          winner: this.state.matchOutcome,
          finalScore: this.state.matchScore,
          reason: 'opponent-left',
        });
      }
    }
    this.ctx.broadcastState();
  }

  onStart(): void {
    const lobby = this.ctx.listPlayers().filter((p) => !p.isSpectator);
    const p1 = lobby[0]?.id ?? null;
    let p2 = lobby[1]?.id ?? null;
    if (p1 && !p2) p2 = AI_PLAYER_ID;
    this.state.assignments = { p1, p2 };
    this.state.matchScore = { p1: 0, p2: 0, draws: 0 };
    this.state.history = [];
    this.state.matchOutcome = null;
    this.startRound(1);
  }

  onEnd(): void {
    this.cancelAllTimers();
  }

  dispose(): void {
    this.cancelAllTimers();
  }

  getStateFor(playerId: string): RpsClientView {
    const seat = this.seatFor(playerId);
    const viewRound: RpsRound = {
      number: this.state.currentRound.number,
      deadline: this.state.currentRound.deadline,
      outcome: this.state.currentRound.outcome,
      p1Choice: null,
      p2Choice: null,
    };
    const showAll = this.state.status === 'REVEALING' || this.state.status === 'MATCH_OVER';
    viewRound.p1Choice = showAll
      ? this.state.currentRound.p1Choice
      : seat === 'p1'
        ? this.state.currentRound.p1Choice
        : null;
    viewRound.p2Choice = showAll
      ? this.state.currentRound.p2Choice
      : seat === 'p2'
        ? this.state.currentRound.p2Choice
        : null;

    const pickedThisRound = seat === 'p1'
      ? this.state.currentRound.p1Choice !== null
      : seat === 'p2'
        ? this.state.currentRound.p2Choice !== null
        : false;

    return {
      status: this.state.status,
      bestOf: this.state.bestOf,
      assignments: this.state.assignments,
      matchScore: this.state.matchScore,
      currentRound: viewRound,
      history: this.state.history,
      matchOutcome: this.state.matchOutcome,
      you: {
        seat,
        pickedThisRound,
        isYourTurn: this.state.status === 'PICKING' && seat != null && !pickedThisRound,
      },
    };
  }

  handleEvent(playerId: string, event: string, payload: unknown): GameHandlerResult {
    switch (event) {
      case RPS_EVENTS.Pick:
        return this.handlePick(playerId, payload);
      case RPS_EVENTS.SettingsUpdate:
        return this.handleSettings(payload);
      default:
        return { ok: false, code: 'UNKNOWN_EVENT', message: `Unknown event: ${event}` };
    }
  }

  private handleSettings(payload: unknown): GameHandlerResult {
    if (this.state.status !== 'WAITING') {
      return { ok: false, code: 'MATCH_RUNNING', message: 'Settings figés.' };
    }
    const parsed = SettingsSchema.safeParse(payload);
    if (!parsed.success) return { ok: false, code: 'BAD_INPUT', message: 'BO invalide.' };
    if (!RPS_BEST_OF_OPTIONS.includes(parsed.data.bestOf)) {
      return { ok: false, code: 'BAD_INPUT', message: 'BO non supporté.' };
    }
    this.state.bestOf = parsed.data.bestOf;
    this.ctx.broadcastState();
    return { ok: true };
  }

  private handlePick(playerId: string, payload: unknown): GameHandlerResult {
    if (this.state.status !== 'PICKING') {
      return { ok: false, code: 'NOT_PICKING', message: 'Pas la phase de pick.' };
    }
    const parsed = ChoiceSchema.safeParse(payload);
    if (!parsed.success) return { ok: false, code: 'BAD_INPUT', message: 'Choix invalide.' };
    const seat = this.seatFor(playerId);
    if (!seat) return { ok: false, code: 'NOT_PLAYING', message: 'Tu es spectateur.' };
    if (seat === 'p1') this.state.currentRound.p1Choice = parsed.data.choice;
    else this.state.currentRound.p2Choice = parsed.data.choice;
    this.ctx.broadcast(RPS_SERVER_EVENTS.Picked, { playerId });
    const bothPicked =
      this.state.currentRound.p1Choice !== null && this.state.currentRound.p2Choice !== null;
    if (bothPicked) {
      this.cancelTimer();
      this.revealAndAdvance();
    } else {
      this.ctx.broadcastState();
    }
    return { ok: true };
  }

  private startRound(number: number): void {
    this.cancelAllTimers();
    const deadline = Date.now() + PICK_DEADLINE_MS;
    this.state.currentRound = emptyRound(number, deadline);
    this.state.status = 'PICKING';
    this.ctx.broadcast(RPS_SERVER_EVENTS.RoundStart, { roundNumber: number, deadline });
    this.ctx.broadcastState();
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.state.status === 'PICKING') this.revealAndAdvance();
    }, PICK_DEADLINE_MS);
    this.scheduleAiPickIfNeeded();
  }

  /** If the AI is in either seat, schedule its random pick after AI_THINK_MS. */
  private scheduleAiPickIfNeeded(): void {
    const aiSeat: 'p1' | 'p2' | null =
      this.state.assignments.p1 === AI_PLAYER_ID
        ? 'p1'
        : this.state.assignments.p2 === AI_PLAYER_ID
          ? 'p2'
          : null;
    if (!aiSeat) return;
    if (this.aiTimer) clearTimeout(this.aiTimer);
    this.aiTimer = setTimeout(() => {
      this.aiTimer = null;
      if (this.state.status !== 'PICKING') return;
      const choice: Choice = CHOICES[Math.floor(Math.random() * CHOICES.length)]!;
      if (aiSeat === 'p1') this.state.currentRound.p1Choice = choice;
      else this.state.currentRound.p2Choice = choice;
      this.ctx.broadcast(RPS_SERVER_EVENTS.Picked, { playerId: AI_PLAYER_ID });
      const bothPicked =
        this.state.currentRound.p1Choice !== null && this.state.currentRound.p2Choice !== null;
      if (bothPicked) {
        if (this.timer) {
          clearTimeout(this.timer);
          this.timer = null;
        }
        this.revealAndAdvance();
      } else {
        this.ctx.broadcastState();
      }
    }, AI_THINK_MS);
  }

  private revealAndAdvance(): void {
    this.state.status = 'REVEALING';
    const outcome = roundOutcome(
      this.state.currentRound.p1Choice,
      this.state.currentRound.p2Choice,
    );
    this.state.currentRound.outcome = outcome;
    this.state.matchScore = applyRound(this.state.matchScore, outcome);
    this.state.history.push({
      number: this.state.currentRound.number,
      p1Choice: this.state.currentRound.p1Choice,
      p2Choice: this.state.currentRound.p2Choice,
      outcome,
    });
    this.ctx.broadcast(RPS_SERVER_EVENTS.RoundRevealed, {
      p1Choice: this.state.currentRound.p1Choice,
      p2Choice: this.state.currentRound.p2Choice,
      outcome,
    });
    this.ctx.broadcastState();

    this.cancelTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      if (isMatchOver(this.state.matchScore, this.state.bestOf)) {
        this.state.matchOutcome = matchWinner(this.state.matchScore);
        this.state.status = 'MATCH_OVER';
        const outcomes = deriveOutcomes(this.state);
        if (outcomes) this.ctx.endGame(outcomes);
        this.ctx.broadcast(RPS_SERVER_EVENTS.MatchOver, {
          winner: this.state.matchOutcome,
          finalScore: this.state.matchScore,
        });
        this.ctx.broadcastState();
      } else {
        this.timer = setTimeout(() => {
          this.timer = null;
          this.startRound(this.state.currentRound.number + 1);
        }, INTER_ROUND_MS);
      }
    }, REVEAL_MS);
  }

  private cancelTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private cancelAllTimers(): void {
    this.cancelTimer();
    if (this.aiTimer) {
      clearTimeout(this.aiTimer);
      this.aiTimer = null;
    }
  }

  private seatFor(playerId: string): 'p1' | 'p2' | null {
    if (this.state.assignments.p1 === playerId) return 'p1';
    if (this.state.assignments.p2 === playerId) return 'p2';
    return null;
  }
}

// Re-export side-marker so CHOICES is reachable from the package barrel.
export const __reexport_choices = CHOICES;
