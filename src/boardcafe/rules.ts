// Cloud Tiles 규칙(순수 함수): 타일·패턴·놓을 수 있는지 판정. 렌더링과 분리해 테스트할 수 있다
export type TileColor = 'sky' | 'sunset' | 'dream' | 'forest';
export const COLORS: TileColor[] = ['sky', 'sunset', 'dream', 'forest'];
export const COLOR_HEX: Record<TileColor, string> = { sky: '#7FB3F5', sunset: '#FF9A4D', dream: '#B39AF0', forest: '#6CC07A' };

export interface Tile {
  id: string;
  color: TileColor;
  n: number; // 1~6
}

// 색 조건: same = 모두 같은 색, diff = 모두 다른 색, any = 무관
export type ColorRule = 'same' | 'diff' | 'any';
export interface Pattern {
  id: string;
  name: string;
  slots: (number | null)[]; // 슬롯마다 필요한 숫자(null = 숫자 무관)
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

// 4색 × 1~6 × 2장 = 48장
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

// "같은 색" 패턴은 첫 타일이 놓이면 색이 정해진다
export function lockedColor(p: Pattern, filled: (Tile | null)[]): TileColor | null {
  if (p.color !== 'same') return null;
  return filled.find((t) => t)?.color ?? null;
}

// 이 슬롯에 이 타일을 놓을 수 있는가
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

// 다음 패턴: 방금 것과 같은 패턴은 연속으로 나오지 않게
export function nextPattern(prevId: string | null, rand = Math.random): Pattern {
  const pool = PATTERNS.filter((p) => p.id !== prevId);
  return pool[Math.floor(rand() * pool.length)];
}
