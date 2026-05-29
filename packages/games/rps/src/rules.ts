import type { Choice } from './state.js';

export function beats(a: Choice, b: Choice): boolean {
  return (
    (a === 'rock' && b === 'scissors') ||
    (a === 'scissors' && b === 'paper') ||
    (a === 'paper' && b === 'rock')
  );
}

export function roundOutcome(p1: Choice | null, p2: Choice | null): 'p1' | 'p2' | 'draw' {
  if (!p1 && !p2) return 'draw';
  if (!p1) return 'p2';
  if (!p2) return 'p1';
  if (p1 === p2) return 'draw';
  return beats(p1, p2) ? 'p1' : 'p2';
}
