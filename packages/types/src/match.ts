export type BestOf = 1 | 3 | 5 | 7;

export interface MatchScore {
  p1: number;
  p2: number;
  draws: number;
}

export type RoundOutcome = 'p1' | 'p2' | 'draw';

export const BEST_OF_OPTIONS: readonly BestOf[] = [1, 3, 5, 7];

export function requiredWins(bestOf: BestOf): number {
  return Math.ceil(bestOf / 2);
}

export function applyRound(score: MatchScore, outcome: RoundOutcome): MatchScore {
  if (outcome === 'draw') return { ...score, draws: score.draws + 1 };
  return { ...score, [outcome]: score[outcome] + 1 };
}

export function isMatchOver(score: MatchScore, bestOf: BestOf): boolean {
  const need = requiredWins(bestOf);
  if (score.p1 >= need || score.p2 >= need) return true;
  return score.p1 + score.p2 + score.draws >= bestOf * 2;
}

export function matchWinner(score: MatchScore): 'p1' | 'p2' | 'draw' {
  if (score.p1 > score.p2) return 'p1';
  if (score.p2 > score.p1) return 'p2';
  return 'draw';
}
