import type { BoardCell, CellType, EventType } from './types.js';

const TOTAL = 40;
const INNER_COUNT = 38;

const RATIOS: { type: CellType; count: number }[] = [
  { type: 'bonus', count: 6 },
  { type: 'malus', count: 6 },
  { type: 'safe', count: 3 },
  { type: 'event', count: 5 },
  { type: 'normal', count: 18 },
];

const EVENT_TYPES: EventType[] = ['minigame', 'vote', 'swap', 'minigame', 'vote'];

function uid(index: number): string {
  return `cell-${index}`;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function buildTypeSequence(): CellType[] {
  const pool: CellType[] = [];
  for (const { type, count } of RATIOS) {
    for (let i = 0; i < count; i++) pool.push(type);
  }
  while (pool.length < INNER_COUNT) pool.push('normal');

  let candidate = shuffle(pool);
  let attempts = 0;
  while (!satisfiesConstraints(candidate) && attempts < 200) {
    candidate = shuffle(pool);
    attempts++;
  }
  if (!satisfiesConstraints(candidate)) {
    candidate = forceConstraints(candidate);
  }
  return candidate;
}

function satisfiesConstraints(seq: CellType[]): boolean {
  let normalsSinceLastEvent = 999;
  for (let i = 0; i < seq.length; i++) {
    const type = seq[i]!;
    if (type === 'malus' && seq[i - 1] === 'malus') return false;
    if (type === 'event') {
      if (normalsSinceLastEvent < 2) return false;
      normalsSinceLastEvent = 0;
    } else if (type === 'normal') {
      normalsSinceLastEvent++;
    }
  }
  if (seq[seq.length - 1] !== 'normal') return false;
  return true;
}

function forceConstraints(seq: CellType[]): CellType[] {
  const result = [...seq];
  const lastNormalIdx = [...result].reverse().findIndex(t => t === 'normal');
  if (lastNormalIdx !== -1 && result[result.length - 1] !== 'normal') {
    const realIdx = result.length - 1 - lastNormalIdx;
    [result[result.length - 1], result[realIdx]] = [result[realIdx]!, result[result.length - 1]!];
  }
  for (let i = 0; i < result.length - 1; i++) {
    if (result[i] === 'event' && (result[i + 1] === 'event' || result[i + 1] === 'malus')) {
      for (let j = i + 2; j < result.length; j++) {
        if (result[j] === 'normal') {
          [result[i + 1], result[j]] = [result[j]!, result[i + 1]!];
          break;
        }
      }
    }
  }
  return result;
}

function buildPositions(count: number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  const cols = 8;
  const rows = Math.ceil(count / cols);
  const cellW = 80;
  const cellH = 100;
  let idx = 0;
  for (let row = 0; row < rows; row++) {
    const leftToRight = row % 2 === 0;
    for (let col = 0; col < cols && idx < count; col++, idx++) {
      const c = leftToRight ? col : cols - 1 - col;
      positions.push({
        x: 40 + c * cellW,
        y: 40 + row * cellH,
      });
    }
  }
  return positions;
}

export function generateBoard(): BoardCell[] {
  const typeSeq = buildTypeSequence();
  const allTypes: CellType[] = ['start', ...typeSeq, 'finish'];
  const positions = buildPositions(TOTAL);

  const eventTypesShuffled = shuffle([...EVENT_TYPES]);
  let eventIdx = 0;

  const cells: BoardCell[] = allTypes.map((type, i) => {
    const cell: BoardCell = {
      id: uid(i),
      index: i,
      position: positions[i]!,
      neighbors: [],
      type,
    };
    if (type === 'event') {
      cell.event = eventTypesShuffled[eventIdx % eventTypesShuffled.length];
      eventIdx++;
    }
    return cell;
  });

  for (let i = 0; i < TOTAL - 1; i++) {
    cells[i]!.neighbors = [uid(i + 1)];
  }
  cells[TOTAL - 1]!.neighbors = [];

  addFork(cells, 12, 15, 16);
  addFork(cells, 22, 25, 26);

  return cells;
}

function addFork(cells: BoardCell[], forkIdx: number, altIdx: number, rejoinIdx: number): void {
  const forkCell = cells[forkIdx];
  const altCell = cells[altIdx];
  const rejoinCell = cells[rejoinIdx];
  if (!forkCell || !altCell || !rejoinCell) return;

  forkCell.neighbors = [uid(forkIdx + 1), uid(altIdx)];
  altCell.neighbors = [uid(rejoinIdx)];
}
