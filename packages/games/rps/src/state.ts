import type { BestOf, MatchScore } from '@tabswitch/types';

export type Choice = 'rock' | 'paper' | 'scissors';
export const CHOICES: readonly Choice[] = ['rock', 'paper', 'scissors'];

export type RpsStatus = 'WAITING' | 'PICKING' | 'REVEALING' | 'MATCH_OVER';

export interface RpsRound {
  number: number;
  p1Choice: Choice | null;
  p2Choice: Choice | null;
  deadline: number; // timestamp ms
  outcome: 'p1' | 'p2' | 'draw' | null;
}

export type MatchOutcome = 'p1' | 'p2' | 'draw' | null;

export interface RpsState {
  status: RpsStatus;
  bestOf: BestOf;
  assignments: { p1: string | null; p2: string | null };
  matchScore: MatchScore;
  currentRound: RpsRound;
  history: Array<Pick<RpsRound, 'number' | 'p1Choice' | 'p2Choice' | 'outcome'>>;
  matchOutcome: MatchOutcome;
}

export interface RpsClientView {
  status: RpsStatus;
  bestOf: BestOf;
  assignments: { p1: string | null; p2: string | null };
  matchScore: MatchScore;
  currentRound: RpsRound;
  history: Array<Pick<RpsRound, 'number' | 'p1Choice' | 'p2Choice' | 'outcome'>>;
  matchOutcome: MatchOutcome;
  you: {
    seat: 'p1' | 'p2' | null;
    pickedThisRound: boolean;
    isYourTurn: boolean;
  };
}
