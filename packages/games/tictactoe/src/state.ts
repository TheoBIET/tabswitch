import type { BestOf, MatchScore } from '@tabswitch/types';

export type Mark = 'X' | 'O';
export type Cell = Mark | null;
export type Board = readonly [
  readonly [Cell, Cell, Cell],
  readonly [Cell, Cell, Cell],
  readonly [Cell, Cell, Cell],
];
export type MutableBoard = [
  [Cell, Cell, Cell],
  [Cell, Cell, Cell],
  [Cell, Cell, Cell],
];

export type WinLine = readonly [
  readonly [number, number],
  readonly [number, number],
  readonly [number, number],
];

export type Outcome = Mark | 'draw' | null;

export type TicTacToeMatchOutcome = 'p1' | 'p2' | 'draw' | null;

export interface TicTacToeState {
  board: MutableBoard;
  currentPlayer: Mark;
  /** Mark → playerId. Filled in by `assignMarks` at game start. */
  assignments: { X: string | null; O: string | null };
  winner: Outcome;
  winLine: WinLine | null;
  /** Total games played in this room (for rematch counter). */
  matchNumber: number;
  bestOf: BestOf;
  matchScore: MatchScore;
  roundNumber: number;
  matchOutcome: TicTacToeMatchOutcome;
}

export interface TicTacToeClientView {
  board: Board;
  currentPlayer: Mark;
  assignments: { X: string | null; O: string | null };
  winner: Outcome;
  winLine: WinLine | null;
  matchNumber: number;
  bestOf: BestOf;
  matchScore: MatchScore;
  roundNumber: number;
  matchOutcome: TicTacToeMatchOutcome;
  you: {
    mark: Mark | null;
    isYourTurn: boolean;
  };
}

export const TICTACTOE_EVENTS = {
  Move: 'move',
  Reset: 'reset',
} as const;

export const TICTACTOE_SERVER_EVENTS = {
  Moved: 'moved',
  GameOver: 'game-over',
  Reset: 'reset',
} as const;

export const EMPTY_BOARD = (): MutableBoard => [
  [null, null, null],
  [null, null, null],
  [null, null, null],
];
