// packages/games/plateau/src/fsm.test.ts
import { describe, it, expect } from 'vitest';
import { generateBoard } from './generator.js';
import {
  buildInitialState,
  applyRoll,
  applyMove,
  applyCaseEffect,
  applyVote,
  applySwap,
  advanceTurn,
  buildClientViewFor,
  findCellById,
  movePawnSteps,
} from './fsm.js';

function makePlayers(ids: string[]) {
  return ids.map((id, i) => ({
    id,
    nickname: `Player${i}`,
    avatarSeed: id,
    cellId: 'cell-0',
    protected: false,
    skipsNextTurn: false,
    arrivedAt: null,
  }));
}

describe('buildInitialState', () => {
  it('crée un état ROLLING avec les joueurs donnés', () => {
    const board = generateBoard();
    const players = makePlayers(['p1', 'p2']);
    const state = buildInitialState(board, players);
    expect(state.phase).toBe('ROLLING');
    expect(state.players).toHaveLength(2);
    expect(state.turn.number).toBe(1);
    expect(state.players[0]!.cellId).toBe('cell-0');
  });
});

describe('applyRoll', () => {
  it('enregistre le résultat du dé pour le joueur', () => {
    const board = generateBoard();
    const state = buildInitialState(board, makePlayers(['p1', 'p2']));
    const newState = applyRoll(state, 'p1', 4);
    expect(newState.turn.dice['p1']).toBe(4);
  });

  it('passe en MOVING quand tous les joueurs ont lancé', () => {
    const board = generateBoard();
    let state = buildInitialState(board, makePlayers(['p1', 'p2']));
    state = applyRoll(state, 'p1', 3);
    state = applyRoll(state, 'p2', 5);
    expect(state.phase).toBe('MOVING');
  });

  it('reste en ROLLING si tous n\'ont pas encore lancé', () => {
    const board = generateBoard();
    let state = buildInitialState(board, makePlayers(['p1', 'p2']));
    state = applyRoll(state, 'p1', 3);
    expect(state.phase).toBe('ROLLING');
  });
});

describe('movePawnSteps', () => {
  it('déplace un pion de N cases', () => {
    const board = generateBoard();
    const newCellId = movePawnSteps(board, 'cell-0', 3);
    expect(newCellId).toBe('cell-3');
  });

  it('s\'arrête à finish si on dépasse', () => {
    const board = generateBoard();
    const result = movePawnSteps(board, 'cell-37', 5);
    expect(result).toBe('cell-39');
  });
});

describe('applyMove', () => {
  it('déplace le premier joueur et enregistre movedPlayers', () => {
    const board = generateBoard();
    let state = buildInitialState(board, makePlayers(['p1', 'p2']));
    state = applyRoll(state, 'p1', 2);
    state = applyRoll(state, 'p2', 3);
    const newState = applyMove(state, 'p1');
    expect(newState.players.find(p => p.id === 'p1')!.cellId).toBe('cell-2');
    expect(newState.turn.movedPlayers).toContain('p1');
  });
});

describe('applyCaseEffect — bonus', () => {
  it('avance le joueur de 3 cases supplémentaires', () => {
    const board = generateBoard();
    const bonusCell = board.find(c => c.type === 'bonus');
    if (!bonusCell) return;
    const players = makePlayers(['p1']);
    players[0]!.cellId = bonusCell.id;
    const state = buildInitialState(board, players);
    const newState = applyCaseEffect(state, 'p1');
    const player = newState.players.find(p => p.id === 'p1')!;
    const expectedIndex = Math.min(bonusCell.index + 3, 39);
    expect(findCellById(board, player.cellId)!.index).toBe(expectedIndex);
  });
});

describe('applyCaseEffect — malus avec protection', () => {
  it('absorbe le malus si le joueur est protected', () => {
    const board = generateBoard();
    const malusCell = board.find(c => c.type === 'malus');
    if (!malusCell) return;
    const players = makePlayers(['p1']);
    players[0]!.cellId = malusCell.id;
    players[0]!.protected = true;
    const state = buildInitialState(board, players);
    const newState = applyCaseEffect(state, 'p1');
    const player = newState.players.find(p => p.id === 'p1')!;
    expect(player.cellId).toBe(malusCell.id);
    expect(player.protected).toBe(false);
  });
});

describe('applyVote', () => {
  it('enregistre le vote d\'un joueur', () => {
    const board = generateBoard();
    const state = buildInitialState(board, makePlayers(['p1', 'p2', 'p3']));
    const stateWithVote = {
      ...state,
      phase: 'VOTE' as const,
      pendingEvent: {
        type: 'vote' as const,
        targetPlayerId: 'p1',
        votes: {},
        deadlineMs: Date.now() + 20000,
      },
    };
    const newState = applyVote(stateWithVote, 'p2', 'reculer');
    expect((newState.pendingEvent as { votes: Record<string, string> }).votes['p2']).toBe('reculer');
  });
});

describe('applySwap', () => {
  it('échange les positions de deux joueurs', () => {
    const board = generateBoard();
    const players = makePlayers(['p1', 'p2']);
    players[0]!.cellId = 'cell-5';
    players[1]!.cellId = 'cell-10';
    const state = buildInitialState(board, players);
    const stateWithSwap = {
      ...state,
      phase: 'SWAP' as const,
      pendingEvent: {
        type: 'swap' as const,
        initiatorId: 'p1',
        targetId: 'p2',
        deadlineMs: Date.now() + 15000,
      },
    };
    const newState = applySwap(stateWithSwap);
    const p1 = newState.players.find(p => p.id === 'p1')!;
    const p2 = newState.players.find(p => p.id === 'p2')!;
    expect(p1.cellId).toBe('cell-10');
    expect(p2.cellId).toBe('cell-5');
  });
});

describe('advanceTurn', () => {
  it('remet phase à ROLLING et vide le dé', () => {
    const board = generateBoard();
    const state = buildInitialState(board, makePlayers(['p1', 'p2']));
    const newState = advanceTurn(state);
    expect(newState.phase).toBe('ROLLING');
    expect(newState.turn.dice).toEqual({});
    expect(newState.turn.movedPlayers).toEqual([]);
    expect(newState.turn.number).toBe(2);
  });
});

describe('buildClientViewFor', () => {
  it('inclut isActivePlayer correctement', () => {
    const board = generateBoard();
    const state = buildInitialState(board, makePlayers(['p1', 'p2']));
    const view = buildClientViewFor(state, 'p1');
    expect(view.you.playerId).toBe('p1');
    expect(view.you.isActivePlayer).toBe(true);

    const view2 = buildClientViewFor(state, 'p2');
    expect(view2.you.isActivePlayer).toBe(false);
  });
});
