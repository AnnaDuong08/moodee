// Cloud Tiles rules (pure functions): tiles, patterns, and placement checks. Kept separate from rendering so they can be tested
export type TileColor = 'sky' | 'sunset' | 'dream' | 'forest';
export const COLORS: TileColor[] = ['sky', 'sunset', 'dream', 'forest'];
export const COLOR_HEX: Record<TileColor, string> = { sky: '#7FB3F5', sunset: '#FF9A4D', dream: '#B39AF0', forest: '#6CC07A' };

export interface Tile {
  id: string;
  color: TileColor;
  n: number; // 1~6
}

// Color condition: same = all the same color, diff = all different colors, any = doesn't matter
export type ColorRule = 'same' | 'diff' | 'any';
export interface Pattern {
  id: string;
  name: string;
  slots: (number | null)[]; // Number required per slot (null = any number)
  color: ColorRule;
}

export const PATTERNS: Pattern[] = [
  { id: 'path_234', name: 'Cloud Path', slots: [2, 3, 4], color: 'same' },
  { id: 'rainbow_555', name: 'Rainbow Fives', slots: [5, 5, 5], color: 'diff' },
  { id: 'pair_33', name: 'Twin Threes', slots: [3, 3], color: 'diff' },
  { id: 'colorstep_123', name: 'Color Steps', slots: [1, 2, 3], color: 'diff' },
  { id: 'pyramid_123', name: 'Cloud Pyramid', slots: [1, 2, 3], color: 'any' },
  { id: 'odd_135_moon', name: 'Moon Odds', slots: [1, 3, 5], color: 'same' },
  { id: 'even_246_sun', name: 'Sun Evens', slots: [2, 4, 6], color: 'same' },
  { id: 'colorcycle', name: 'Color Cycle', slots: [null, null, null, null], color: 'diff' },
];

// 4 colors × 1–6 × 2 copies = 48 tiles
export function makeDeck(): Tile[] {
  const deck: Tile[] = [];
  for (const color of COLORS) for (let n = 1; n <= 6; n++) for (let k = 0; k < 2; k++) deck.push({ id: `${color}-${n}-${k}`, color, n });
  return deck;
}

export function shuffle<T>(list: T[], rand = Math.random): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// For "same color" patterns, the color is fixed once the first tile is placed
export function lockedColor(p: Pattern, filled: (Tile | null)[]): TileColor | null {
  if (p.color !== 'same') return null;
  return filled.find((t) => t)?.color ?? null;
}

// Can this tile be placed in this slot?
export function canPlace(p: Pattern, filled: (Tile | null)[], slot: number, tile: Tile): boolean {
  if (slot < 0 || slot >= p.slots.length || filled[slot]) return false;
  const need = p.slots[slot];
  if (need !== null && need !== tile.n) return false;
  const placed = filled.filter((t): t is Tile => !!t);
  if (p.color === 'same' && placed.some((t) => t.color !== tile.color)) return false;
  if (p.color === 'diff' && placed.some((t) => t.color === tile.color)) return false;
  return true;
}

export const validSlots = (p: Pattern, filled: (Tile | null)[], tile: Tile) => p.slots.map((_, i) => i).filter((i) => canPlace(p, filled, i, tile));
export const isComplete = (filled: (Tile | null)[]) => filled.length > 0 && filled.every(Boolean);

// Next pattern: never the same pattern twice in a row
export function nextPattern(prevId: string | null, rand = Math.random): Pattern {
  const pool = PATTERNS.filter((p) => p.id !== prevId);
  return pool[Math.floor(rand() * pool.length)];
}
