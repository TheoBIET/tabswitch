import { describe, expect, it } from 'vitest';
import { computeRanks, tallyRound } from './scoring.js';
import type { Player, Round } from './state.js';

function mkPlayer(id: string, score = 0, streak = 0): Player {
  return { id, nickname: id, isConnected: true, isSpectator: false, score, streak };
}

function mkRound(
  submissions: Array<{ id: string; playerId: string }>,
  votes: Array<{ voterId: string; submissionId: string }>,
): Round {
  return {
    number: 1,
    themeId: 't',
    themeText: 'theme',
    startedAt: 0,
    deadlineAt: 0,
    submissions: submissions.map((s) => ({
      id: s.id,
      playerId: s.playerId,
      gifId: 'g',
      gifUrl: 'https://media.tenor.com/x.gif',
      previewUrl: 'https://media.tenor.com/x-tiny.gif',
      width: 100,
      height: 100,
      submittedAt: 0,
    })),
    votes: votes.map((v) => ({ voterId: v.voterId, submissionId: v.submissionId, votedAt: 0 })),
    winnerSubmissionIds: [],
  };
}

describe('tallyRound', () => {
  it('awards 100pts per vote', () => {
    const players = [mkPlayer('a', 100), mkPlayer('b', 80), mkPlayer('c', 60), mkPlayer('d', 40)];
    const round = mkRound(
      [
        { id: 's-a', playerId: 'a' },
        { id: 's-b', playerId: 'b' },
        { id: 's-c', playerId: 'c' },
        { id: 's-d', playerId: 'd' },
      ],
      [
        { voterId: 'b', submissionId: 's-a' },
        { voterId: 'c', submissionId: 's-a' },
        { voterId: 'd', submissionId: 's-b' },
        { voterId: 'a', submissionId: 's-c' },
      ],
    );
    const result = tallyRound({
      round,
      players,
      preRoundRanks: computeRanks(players),
      roundParticipations: new Map(),
    });
    const a = result.scoreDeltas.find((d) => d.playerId === 'a')!;
    expect(a.breakdown.basePts).toBe(200);
    expect(a.breakdown.winnerBonus).toBe(50);
    expect(a.breakdown.shutoutBonus).toBe(0);
    expect(a.breakdown.underdogBonus).toBe(0);
    expect(a.delta).toBe(250);
    expect(result.winnerSubmissionIds).toEqual(['s-a']);
  });

  it('splits winner bonus on ties', () => {
    const players = ['a', 'b', 'c'].map((id) => mkPlayer(id));
    const round = mkRound(
      [
        { id: 's-a', playerId: 'a' },
        { id: 's-b', playerId: 'b' },
        { id: 's-c', playerId: 'c' },
      ],
      [
        { voterId: 'c', submissionId: 's-a' },
        { voterId: 'a', submissionId: 's-b' },
      ],
    );
    const result = tallyRound({
      round,
      players,
      preRoundRanks: computeRanks(players),
      roundParticipations: new Map(),
    });
    const a = result.scoreDeltas.find((d) => d.playerId === 'a')!;
    const b = result.scoreDeltas.find((d) => d.playerId === 'b')!;
    expect(a.breakdown.winnerBonus).toBe(25);
    expect(b.breakdown.winnerBonus).toBe(25);
    expect(result.winnerSubmissionIds.sort()).toEqual(['s-a', 's-b']);
  });

  it('gives underdog bonus when last-place player wins', () => {
    const players = [mkPlayer('a', 500), mkPlayer('b', 300), mkPlayer('c', 0)];
    const round = mkRound(
      [
        { id: 's-a', playerId: 'a' },
        { id: 's-b', playerId: 'b' },
        { id: 's-c', playerId: 'c' },
      ],
      [
        { voterId: 'a', submissionId: 's-c' },
        { voterId: 'b', submissionId: 's-c' },
      ],
    );
    const result = tallyRound({
      round,
      players,
      preRoundRanks: computeRanks(players),
      roundParticipations: new Map(),
    });
    const c = result.scoreDeltas.find((d) => d.playerId === 'c')!;
    expect(c.breakdown.underdogBonus).toBe(25);
    expect(c.delta).toBeGreaterThanOrEqual(200 + 50 + 25);
  });

  it('grants shutout bonus when every eligible voter votes for you', () => {
    const players = ['a', 'b', 'c'].map((id) => mkPlayer(id));
    const round = mkRound(
      [
        { id: 's-a', playerId: 'a' },
        { id: 's-b', playerId: 'b' },
        { id: 's-c', playerId: 'c' },
      ],
      [
        { voterId: 'b', submissionId: 's-a' },
        { voterId: 'c', submissionId: 's-a' },
      ],
    );
    const result = tallyRound({
      round,
      players,
      preRoundRanks: computeRanks(players),
      roundParticipations: new Map(),
    });
    const a = result.scoreDeltas.find((d) => d.playerId === 'a')!;
    expect(a.breakdown.shutoutBonus).toBe(50);
  });

  it('gives zeroVotePity after >=3 participations with 0 votes', () => {
    const players = ['a', 'b', 'c'].map((id) => mkPlayer(id));
    const round = mkRound(
      [
        { id: 's-a', playerId: 'a' },
        { id: 's-b', playerId: 'b' },
        { id: 's-c', playerId: 'c' },
      ],
      [
        { voterId: 'a', submissionId: 's-b' },
        { voterId: 'c', submissionId: 's-b' },
      ],
    );
    const participations = new Map([
      ['a', 4],
      ['b', 4],
      ['c', 4],
    ]);
    const result = tallyRound({
      round,
      players,
      preRoundRanks: computeRanks(players),
      roundParticipations: participations,
    });
    const c = result.scoreDeltas.find((d) => d.playerId === 'c')!;
    expect(c.breakdown.zeroVotePity).toBe(10);
  });

  it('streak bonus kicks in at streak >= 2', () => {
    const players = [mkPlayer('a', 0, 1), mkPlayer('b'), mkPlayer('c')];
    const round = mkRound(
      [
        { id: 's-a', playerId: 'a' },
        { id: 's-b', playerId: 'b' },
        { id: 's-c', playerId: 'c' },
      ],
      [
        { voterId: 'b', submissionId: 's-a' },
        { voterId: 'c', submissionId: 's-a' },
      ],
    );
    const result = tallyRound({
      round,
      players,
      preRoundRanks: computeRanks(players),
      roundParticipations: new Map(),
    });
    const a = result.scoreDeltas.find((d) => d.playerId === 'a')!;
    expect(a.newStreak).toBe(2);
    expect(a.breakdown.streakBonus).toBe(25);
  });

  it('resets streak when player does not win', () => {
    const players = [mkPlayer('a', 0, 3), mkPlayer('b'), mkPlayer('c')];
    const round = mkRound(
      [
        { id: 's-a', playerId: 'a' },
        { id: 's-b', playerId: 'b' },
        { id: 's-c', playerId: 'c' },
      ],
      [
        { voterId: 'a', submissionId: 's-b' },
        { voterId: 'c', submissionId: 's-b' },
      ],
    );
    const result = tallyRound({
      round,
      players,
      preRoundRanks: computeRanks(players),
      roundParticipations: new Map(),
    });
    const a = result.scoreDeltas.find((d) => d.playerId === 'a')!;
    expect(a.newStreak).toBe(0);
    expect(a.breakdown.streakBonus).toBe(0);
  });
});

describe('computeRanks', () => {
  it('handles ties properly', () => {
    const players = [mkPlayer('a', 100), mkPlayer('b', 100), mkPlayer('c', 50)];
    const ranks = computeRanks(players);
    expect(ranks.get('a')).toBe(1);
    expect(ranks.get('b')).toBe(1);
    expect(ranks.get('c')).toBe(3);
  });

  it('ignores spectators', () => {
    const players: Player[] = [
      mkPlayer('a', 100),
      { ...mkPlayer('s', 9999), isSpectator: true },
    ];
    const ranks = computeRanks(players);
    expect(ranks.size).toBe(1);
    expect(ranks.get('a')).toBe(1);
  });
});
