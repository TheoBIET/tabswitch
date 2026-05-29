import { describe, expect, it } from 'vitest';
import { beats, roundOutcome } from './rules.js';

describe('beats', () => {
  it('rock beats scissors', () => {
    expect(beats('rock', 'scissors')).toBe(true);
    expect(beats('scissors', 'rock')).toBe(false);
  });
  it('scissors beats paper', () => {
    expect(beats('scissors', 'paper')).toBe(true);
    expect(beats('paper', 'scissors')).toBe(false);
  });
  it('paper beats rock', () => {
    expect(beats('paper', 'rock')).toBe(true);
    expect(beats('rock', 'paper')).toBe(false);
  });
  it('same choice returns false', () => {
    expect(beats('rock', 'rock')).toBe(false);
    expect(beats('paper', 'paper')).toBe(false);
    expect(beats('scissors', 'scissors')).toBe(false);
  });
});

describe('roundOutcome', () => {
  it('both null → draw', () => {
    expect(roundOutcome(null, null)).toBe('draw');
  });
  it('p1 null, p2 picked → p2 wins by forfeit', () => {
    expect(roundOutcome(null, 'rock')).toBe('p2');
  });
  it('p2 null, p1 picked → p1 wins by forfeit', () => {
    expect(roundOutcome('rock', null)).toBe('p1');
  });
  it('equal picks → draw', () => {
    expect(roundOutcome('rock', 'rock')).toBe('draw');
  });
  it('p1 beats p2 → p1', () => {
    expect(roundOutcome('rock', 'scissors')).toBe('p1');
    expect(roundOutcome('scissors', 'paper')).toBe('p1');
    expect(roundOutcome('paper', 'rock')).toBe('p1');
  });
  it('p2 beats p1 → p2', () => {
    expect(roundOutcome('scissors', 'rock')).toBe('p2');
    expect(roundOutcome('paper', 'scissors')).toBe('p2');
    expect(roundOutcome('rock', 'paper')).toBe('p2');
  });
});
