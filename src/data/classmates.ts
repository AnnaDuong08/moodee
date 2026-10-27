// People studying in the same classroom (fixed demo data).
// Real other users need a server, so for now this only shows the experience of "seeing who is studying what".
import { PLAYABLE as CHARACTERS, type Character, type CharacterId } from './characters';

export interface Classmate {
  id: string;
  name: string;
  subject: string;
  topSeat: string; // Top-view seat ID (SeatPicker)
  // Chair to sit in for the eye-level view (image px): row, chair center x, hip height, character frame height ratio
  back: { row: 1 | 2; x: number; hipY: number; h: number };
}

export const CLASSMATES: Classmate[] = [
  { id: 'hieu', name: 'Hieu', subject: 'Coding', topSeat: '2B', back: { row: 2, x: 262, hipY: 752, h: 0.225 } },
  { id: 'chi', name: 'Chi', subject: 'Reading', topSeat: '1C', back: { row: 1, x: 664, hipY: 620, h: 0.178 } },
  { id: 'luna', name: 'Luna', subject: 'Chemistry', topSeat: '2D', back: { row: 2, x: 874, hipY: 752, h: 0.225 } },
];

// Assign the characters other than mine to friends in turn
export function classmateLooks(mine: CharacterId): Record<string, Character> {
  const rest = CHARACTERS.filter((c) => c.id !== mine);
  return Object.fromEntries(CLASSMATES.map((m, i) => [m.id, rest[i % rest.length]]));
}
