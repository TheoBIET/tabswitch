import { SCORE } from './constants.js';
import type {
  Player,
  PlayerId,
  Round,
  ScoreDelta,
  Submission,
} from './state.js';

export interface ScoreInputs {
  round: Round;
  players: Player[];
  /** Map playerId → rank before this round (1 = highest). */
  preRoundRanks: Map<PlayerId, number>;
  /** Map playerId → participation count so far. */
  roundParticipations: Map<PlayerId, number>;
}

export interface TallyResult {
  winnerSubmissionIds: string[];
  scoreDeltas: ScoreDelta[];
}

/**
 * Pure tally. Scoring rules:
 *   - basePts        = votesReceived * 100
 *   - winnerBonus    = 50 (split ceil if tied)
 *   - streakBonus    = floor(50 * (streak-1) / 2) if streak >= 2 (uses new streak)
 *   - underdogBonus  = 25 if was last before round AND is winner
 *   - shutoutBonus   = 50 if voteCount === eligibleVoters
 *   - zeroVotePity   = 10 if roundParticipations >= 3 and 0 votes received
 */
export function tallyRound(inputs: ScoreInputs): TallyResult {
  const { round, players, preRoundRanks, roundParticipations } = inputs;
  const eligibleVoterIds = new Set(players.filter((p) => !p.isSpectator).map((p) => p.id));

  const votesBySub = new Map<string, PlayerId[]>();
  for (const s of round.submissions) votesBySub.set(s.id, []);
  for (const v of round.votes) {
    if (!eligibleVoterIds.has(v.voterId)) continue;
    const arr = votesBySub.get(v.submissionId);
    if (arr) arr.push(v.voterId);
  }

  let maxVotes = 0;
  for (const arr of votesBySub.values()) {
    if (arr.length > maxVotes) maxVotes = arr.length;
  }
  const winnerSubs: Submission[] =
    maxVotes > 0
      ? round.submissions.filter((s) => (votesBySub.get(s.id)?.length ?? 0) === maxVotes)
      : [];
  const winnerSubIds = winnerSubs.map((s) => s.id);
  const winnerSplitDenominator = Math.max(1, winnerSubs.length);

  let lastRank = 0;
  for (const r of preRoundRanks.values()) if (r > lastRank) lastRank = r;

  const deltas: ScoreDelta[] = [];

  for (const player of players) {
    if (player.isSpectator) continue;
    const sub = round.submissions.find((s) => s.playerId === player.id);
    const voteCount = sub ? (votesBySub.get(sub.id)?.length ?? 0) : 0;

    const isRoundWinner = sub != null && winnerSubIds.includes(sub.id);

    const basePts = voteCount * SCORE.pointsPerVote;
    const winnerBonus = isRoundWinner
      ? Math.ceil(SCORE.winnerBonus / winnerSplitDenominator)
      : 0;

    const newStreak = isRoundWinner ? player.streak + 1 : 0;
    const streakBonus =
      newStreak >= SCORE.streakMin ? Math.floor((SCORE.winnerBonus * (newStreak - 1)) / 2) : 0;

    const eligibleVoters = eligibleVoterIds.size - (sub ? 1 : 0);
    const shutoutBonus =
      sub != null && eligibleVoters > 0 && voteCount === eligibleVoters ? SCORE.shutoutBonus : 0;

    const wasLast = (preRoundRanks.get(player.id) ?? 0) === lastRank && lastRank > 0;
    const underdogBonus = wasLast && isRoundWinner ? SCORE.underdogBonus : 0;

    const participations = roundParticipations.get(player.id) ?? 0;
    const zeroVotePity =
      participations >= 3 && voteCount === 0 && sub != null ? SCORE.zeroVotePity : 0;

    const delta =
      basePts + winnerBonus + streakBonus + underdogBonus + shutoutBonus + zeroVotePity;

    deltas.push({
      playerId: player.id,
      delta,
      breakdown: { basePts, winnerBonus, streakBonus, underdogBonus, shutoutBonus, zeroVotePity },
      newScore: player.score + delta,
      newStreak,
    });
  }

  return { winnerSubmissionIds: winnerSubIds, scoreDeltas: deltas };
}

/** Compute pre-round ranks (1 = highest score, ties share rank). */
export function computeRanks(players: Player[]): Map<PlayerId, number> {
  const active = players.filter((p) => !p.isSpectator);
  const sorted = [...active].sort((a, b) => b.score - a.score);
  const ranks = new Map<PlayerId, number>();
  let currentRank = 0;
  let lastScore = Number.POSITIVE_INFINITY;
  sorted.forEach((p, i) => {
    if (p.score < lastScore) {
      currentRank = i + 1;
      lastScore = p.score;
    }
    ranks.set(p.id, currentRank);
  });
  return ranks;
}
