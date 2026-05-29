import { describe, it, expect } from 'vitest';
import { generateBoard } from './generator.js';

describe('generateBoard', () => {
  it('produit exactement 40 cases', () => {
    const board = generateBoard();
    expect(board).toHaveLength(40);
  });

  it('la case 0 est start et la case 39 est finish', () => {
    const board = generateBoard();
    expect(board[0]!.type).toBe('start');
    expect(board[39]!.type).toBe('finish');
  });

  it('pas 2 events consécutifs', () => {
    for (let i = 0; i < 20; i++) {
      const board = generateBoard();
      for (let j = 0; j < board.length - 1; j++) {
        if (board[j]!.type === 'event') {
          expect(board[j + 1]!.type).not.toBe('event');
        }
      }
    }
  });

  it('pas 2 malus consécutifs', () => {
    for (let i = 0; i < 20; i++) {
      const board = generateBoard();
      for (let j = 0; j < board.length - 1; j++) {
        if (board[j]!.type === 'malus') {
          expect(board[j + 1]!.type).not.toBe('malus');
        }
      }
    }
  });

  it('minimum 2 cases normal entre deux events', () => {
    for (let i = 0; i < 20; i++) {
      const board = generateBoard();
      let normalsSinceLastEvent = 999;
      for (const cell of board) {
        if (cell.type === 'event') {
          expect(normalsSinceLastEvent).toBeGreaterThanOrEqual(2);
          normalsSinceLastEvent = 0;
        } else if (cell.type === 'normal') {
          normalsSinceLastEvent++;
        }
      }
    }
  });

  it('case avant finish est normal', () => {
    const board = generateBoard();
    expect(board[38]!.type).toBe('normal');
  });

  it('chaque case a au moins un voisin', () => {
    const board = generateBoard();
    for (const cell of board.slice(0, 39)) {
      expect(cell.neighbors.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('les ids des voisins existent dans le board', () => {
    const board = generateBoard();
    const ids = new Set(board.map(c => c.id));
    for (const cell of board) {
      for (const nId of cell.neighbors) {
        expect(ids.has(nId)).toBe(true);
      }
    }
  });

  it('events ont un champ event défini', () => {
    const board = generateBoard();
    const events = board.filter(c => c.type === 'event');
    for (const cell of events) {
      expect(['minigame', 'vote', 'swap']).toContain(cell.event);
    }
  });

  it('distribution approximative (50 générations)', () => {
    const counts = { normal: 0, bonus: 0, malus: 0, safe: 0, event: 0 };
    const N = 50;
    for (let i = 0; i < N; i++) {
      const board = generateBoard();
      for (const cell of board.slice(1, 39)) {
        if (cell.type in counts) counts[cell.type as keyof typeof counts]++;
      }
    }
    const total = N * 38;
    expect(counts.normal / total).toBeGreaterThan(0.40);
    expect(counts.event / total).toBeLessThan(0.20);
  });
});
