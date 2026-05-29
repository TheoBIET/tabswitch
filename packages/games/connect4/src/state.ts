import type { BestOf, MatchScore } from '@tabswitch/types';

export const ROWS = 6 as const;
export const COLS = 7 as const;

export type Color = 'red' | 'yellow';
export type Cell = Color | null;
export type Board = Cell[][]; // board[0] = top row, board[ROWS-1] = bottom row

export type WinLine = readonly [
  readonly [number, number],
  readonly [number, number],
  readonly [number, number],
  readonly [number, number],
];

export type RoundResult = Color | 'draw' | null;
export type MatchOutcome = 'p1' | 'p2' | 'draw' | null;

export interface Connect4State {
  board: Board;
  currentPlayer: Color;
  assignments: { red: string | null; yellow: string | null };
  winner: RoundResult;
  winLine: WinLine | null;
  matchNumber: number;
  roundNumber: number;
  bestOf: BestOf;
  matchScore: MatchScore;
  matchOutcome: MatchOutcome;
}

export interface Connect4ClientView {
  board: Board;
  currentPlayer: Color;
  assignments: { red: string | null; yellow: string | null };
  winner: RoundResult;
  winLine: WinLine | null;
  matchNumber: number;
  roundNumber: number;
  bestOf: BestOf;
  matchScore: MatchScore;
  matchOutcome: MatchOutcome;
  you: { color: Color | null; isYourTurn: boolean };
}

export function EMPTY_BOARD(): Board {
  return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null));
}
