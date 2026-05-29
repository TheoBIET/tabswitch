import { describe, expect, it } from 'vitest';
import { deriveOutcomes } from './outcomes.js';
import type { GifBattleState, Player } from './state.js';

function mkPlayer(id: string, score: number, isSpectator = false): Player {
  return { id, nickname: id, isConnected: true, isSpectator, score, streak: 0 };
}

function baseState(players: Player[]): GifBattleState {
  return {
    status: 'GAME_END',
    settings: {
      rounds: 3,
      pickSeconds: 45,
      voteSeconds: 30,
      mode: 'classic',
      locale: 'fr',
      gifRating: 'pg',
    },
    players,
    history: [],
  };
}

describe('deriveOutcomes (gif-battle)', () => {
  it('returns null while the game has not ended', () => {
    const state = baseState([mkPlayer('a', 100)]);
    state.status = 'ROUND_VOTING';
    expect(deriveOutcomes(state)).toBeNull();
  });

  it('returns an empty map when there are no active players', () => {
    expect(deriveOutcomes(baseState([]))).toEqual({});
  });

  it('solo top score → that player won, others lost', () => {
    const out = deriveOutcomes(
      baseState([mkPlayer('a', 300), mkPlayer('b', 200), mkPlayer('c', 50)]),
    );
    expect(out).toEqual({ a: 'won', b: 'lost', c: 'lost' });
  });

  it('multi-way tie at the top → all tied players draw', () => {
    const out = deriveOutcomes(
      baseState([mkPlayer('a', 250), mkPlayer('b', 250), mkPlayer('c', 100)]),
    );
    expect(out).toEqual({ a: 'draw', b: 'draw', c: 'lost' });
  });

  it('everyone tied at the top → everyone draws', () => {
    const out = deriveOutcomes(
      baseState([mkPlayer('a', 100), mkPlayer('b', 100), mkPlayer('c', 100)]),
    );
    expect(out).toEqual({ a: 'draw', b: 'draw', c: 'draw' });
  });

  it('ignores spectators', () => {
    const out = deriveOutcomes(
      baseState([
        mkPlayer('a', 100),
        mkPlayer('b', 50),
        mkPlayer('spec', 9999, true),
      ]),
    );
    expect(out).toEqual({ a: 'won', b: 'lost' });
  });
});
