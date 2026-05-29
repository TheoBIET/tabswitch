// packages/games/plateau/src/fsm.ts
import type {
  PlateauState,
  PlateauPlayer,
  BoardCell,
  PendingEvent,
  VoteOption,
  PlateauClientView,
  ClientPendingEvent,
} from './types.js';

export function buildInitialState(
  board: BoardCell[],
  players: PlateauPlayer[],
): PlateauState {
  const cellMap = new Map(board.map((c) => [c.id, c]));
  const initialPlayers = players.map((p) => ({
    ...p,
    skipsNextTurn: p.skipsNextTurn ?? false,
    arrivedAt: p.arrivedAt ?? null,
  }));

  return {
    board,
    cellMap,
    players: initialPlayers,
    phase: 'ROLLING',
    turn: {
      number: 1,
      playerOrder: players.map((p) => p.id),
      activeIndex: 0,
      dice: {},
      movedPlayers: [],
    },
    pendingEvent: null,
    eventLog: [],
  };
}

export function findCellById(board: BoardCell[], id: string): BoardCell | undefined {
  return board.find((c) => c.id === id);
}

export function movePawnSteps(board: BoardCell[], fromId: string, steps: number): string {
  const cellMap = new Map(board.map((c) => [c.id, c]));
  let current = fromId;
  for (let i = 0; i < steps; i++) {
    const cell = cellMap.get(current);
    if (!cell || cell.neighbors.length === 0) break;
    current = cell.neighbors[0]!;
  }
  return current;
}

function movePawn(state: PlateauState, playerId: string, steps: number): PlateauState {
  const players = state.players.map((p) => {
    if (p.id !== playerId) return p;
    const newCellId = movePawnSteps(state.board, p.cellId, steps);
    return { ...p, cellId: newCellId };
  });
  return { ...state, players };
}

export function applyRoll(state: PlateauState, playerId: string, roll: number): PlateauState {
  const dice = { ...state.turn.dice, [playerId]: roll };
  const allRolled = state.turn.playerOrder.every((id) => id in dice);
  return {
    ...state,
    turn: { ...state.turn, dice },
    phase: allRolled ? 'MOVING' : 'ROLLING',
  };
}

export function applyMove(state: PlateauState, playerId: string): PlateauState {
  const roll = state.turn.dice[playerId] ?? 0;
  let newState = movePawn(state, playerId, roll);
  const movedPlayers = [...state.turn.movedPlayers, playerId];
  newState = {
    ...newState,
    turn: { ...newState.turn, movedPlayers },
  };

  const player = newState.players.find((p) => p.id === playerId)!;
  const cell = newState.cellMap.get(player.cellId);
  if (cell?.type === 'finish') {
    const players = newState.players.map((p) =>
      p.id === playerId ? { ...p, arrivedAt: state.turn.number } : p
    );
    newState = { ...newState, players };
    const allArrived = players.every((p) => p.arrivedAt !== null);
    if (allArrived) {
      return { ...newState, phase: 'GAME_OVER' };
    }
  }

  return newState;
}

export function applyCaseEffect(state: PlateauState, playerId: string): PlateauState {
  const player = state.players.find((p) => p.id === playerId)!;
  const cell = state.cellMap.get(player.cellId);
  if (!cell) return state;

  const log = [...state.eventLog];

  switch (cell.type) {
    case 'bonus': {
      const newState = movePawn(state, playerId, 3);
      log.push(`${player.nickname} avance de 3 cases bonus !`);
      return { ...newState, eventLog: log.slice(-5) };
    }
    case 'malus': {
      if (player.protected) {
        const players = state.players.map((p) =>
          p.id === playerId ? { ...p, protected: false } : p
        );
        log.push(`${player.nickname} est protégé — malus absorbé !`);
        return { ...state, players, eventLog: log.slice(-5) };
      }
      const newState = movePawnBack(state, playerId, 3);
      log.push(`${player.nickname} recule de 3 cases.`);
      return { ...newState, eventLog: log.slice(-5) };
    }
    case 'safe': {
      const players = state.players.map((p) =>
        p.id === playerId ? { ...p, protected: true } : p
      );
      log.push(`${player.nickname} est maintenant protégé !`);
      return { ...state, players, eventLog: log.slice(-5) };
    }
    case 'event': {
      if (cell.event === 'vote') {
        const pendingEvent: PendingEvent = {
          type: 'vote',
          targetPlayerId: playerId,
          votes: {},
          deadlineMs: Date.now() + 20000,
        };
        return { ...state, phase: 'VOTE', pendingEvent, eventLog: log.slice(-5) };
      }
      if (cell.event === 'swap') {
        const pendingEvent: PendingEvent = {
          type: 'swap',
          initiatorId: playerId,
          targetId: null,
          deadlineMs: Date.now() + 15000,
        };
        return { ...state, phase: 'SWAP', pendingEvent, eventLog: log.slice(-5) };
      }
      if (cell.event === 'minigame') {
        const pendingEvent: PendingEvent = {
          type: 'minigame',
          gameType: '',
          miniState: null,
          winnerId: null,
        };
        return { ...state, phase: 'MINIGAME_EVENT', pendingEvent, eventLog: log.slice(-5) };
      }
      return state;
    }
    default:
      return state;
  }
}

function movePawnBack(state: PlateauState, playerId: string, steps: number): PlateauState {
  const player = state.players.find((p) => p.id === playerId)!;
  const currentCell = state.cellMap.get(player.cellId);
  if (!currentCell) return state;
  const targetIndex = Math.max(0, currentCell.index - steps);
  const targetCell = state.board[targetIndex];
  if (!targetCell) return state;
  const players = state.players.map((p) =>
    p.id === playerId ? { ...p, cellId: targetCell.id } : p
  );
  return { ...state, players };
}

export function applyVote(
  state: PlateauState,
  voterId: string,
  option: VoteOption,
): PlateauState {
  if (!state.pendingEvent || state.pendingEvent.type !== 'vote') return state;
  const votes = { ...state.pendingEvent.votes, [voterId]: option };
  const pendingEvent: PendingEvent = { ...state.pendingEvent, votes };
  return { ...state, pendingEvent };
}

export function resolveVote(state: PlateauState): PlateauState {
  if (!state.pendingEvent || state.pendingEvent.type !== 'vote') return state;
  const { targetPlayerId, votes } = state.pendingEvent;
  const target = state.players.find((p) => p.id === targetPlayerId)!;

  const tally: Record<VoteOption, number> = {
    reculer: 0,
    passer_tour: 0,
    echanger_dernier: 0,
  };
  for (const v of Object.values(votes)) tally[v]++;

  const options: VoteOption[] = ['reculer', 'passer_tour', 'echanger_dernier'];
  const maxVotes = Math.max(...options.map((o) => tally[o]));
  const winners = options.filter((o) => tally[o] === maxVotes);
  const chosen = winners[Math.floor(Math.random() * winners.length)]!;

  const log = [...state.eventLog, `Vote : ${chosen} pour ${target.nickname}`];
  let newState: PlateauState = { ...state, pendingEvent: null, eventLog: log.slice(-5) };

  if (chosen === 'reculer') {
    if (target.protected) {
      const players = newState.players.map((p) =>
        p.id === targetPlayerId ? { ...p, protected: false } : p
      );
      newState = { ...newState, players };
    } else {
      newState = movePawnBack(newState, targetPlayerId, 3);
    }
  } else if (chosen === 'passer_tour') {
    const players = newState.players.map((p) =>
      p.id === targetPlayerId ? { ...p, skipsNextTurn: true } : p
    );
    newState = { ...newState, players };
  } else if (chosen === 'echanger_dernier') {
    const sorted = [...newState.players].sort((a, b) => {
      const ca = newState.cellMap.get(a.cellId);
      const cb = newState.cellMap.get(b.cellId);
      return (ca?.index ?? 0) - (cb?.index ?? 0);
    });
    const last = sorted.find((p) => p.id !== targetPlayerId);
    if (last) {
      const tCell = newState.cellMap.get(target.cellId)!.id;
      const lCell = newState.cellMap.get(last.cellId)!.id;
      const players = newState.players.map((p) => {
        if (p.id === targetPlayerId) return { ...p, cellId: lCell };
        if (p.id === last.id) return { ...p, cellId: tCell };
        return p;
      });
      newState = { ...newState, players };
    }
  }

  return newState;
}

export function applySwap(state: PlateauState): PlateauState {
  if (!state.pendingEvent || state.pendingEvent.type !== 'swap') return state;
  const { initiatorId, targetId } = state.pendingEvent;
  if (!targetId) return { ...state, pendingEvent: null };

  const initiator = state.players.find((p) => p.id === initiatorId)!;
  const target = state.players.find((p) => p.id === targetId)!;
  const iCell = initiator.cellId;
  const tCell = target.cellId;

  const players = state.players.map((p) => {
    if (p.id === initiatorId) return { ...p, cellId: tCell };
    if (p.id === targetId) return { ...p, cellId: iCell };
    return p;
  });
  const log = [...state.eventLog, `${initiator.nickname} échange avec ${target.nickname} !`];
  return { ...state, players, pendingEvent: null, eventLog: log.slice(-5) };
}

export function advanceTurn(state: PlateauState): PlateauState {
  return {
    ...state,
    phase: 'ROLLING',
    turn: {
      ...state.turn,
      number: state.turn.number + 1,
      dice: {},
      movedPlayers: [],
    },
    pendingEvent: null,
  };
}

export function buildClientViewFor(state: PlateauState, playerId: string): PlateauClientView {
  const activePlayerId = state.turn.playerOrder[state.turn.activeIndex] ?? '';
  const pendingEvent: ClientPendingEvent | null = state.pendingEvent
    ? (state.pendingEvent as ClientPendingEvent)
    : null;

  return {
    board: state.board,
    players: state.players,
    phase: state.phase,
    turn: {
      number: state.turn.number,
      playerOrder: state.turn.playerOrder,
      activeIndex: state.turn.activeIndex,
      dice: state.turn.dice,
      movedPlayers: state.turn.movedPlayers,
    },
    pendingEvent,
    eventLog: state.eventLog,
    you: {
      playerId,
      isActivePlayer: playerId === activePlayerId,
    },
  };
}
