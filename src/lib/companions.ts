// Demo companions (autonomous demo NPC companions): not real multiplayer — builds a friend list from a head count chosen once at the start
// Friends are scattered across spaces each session; enter a space to meet them as NPCs
import { CHARACTERS, PLAYABLE, type Character, type CharacterId } from '../data/characters';
import { loadValue, save } from './storage';

export type CompanionSpace = 'cafe' | 'library';
export interface Companion {
  id: string;
  name: string;
  character: Character;
  space: CompanionSpace;
  doing: string; // What they're doing in that space (name tag)
}

const KEY = 'demoSettings';
export const MAX_COMPANIONS = 4;
export const getCompanionCount = () => loadValue<{ companionCount: number } | null>(KEY, null)?.companionCount ?? null;
export function setCompanionCount(n: number) {
  save(KEY, { companionCount: Math.max(0, Math.min(MAX_COMPANIONS, n)) });
  roster = null;
}

const NAMES = ['Hieu', 'Chi', 'Luna'];
const DOING: Record<CompanionSpace, string[]> = { cafe: ['Chatting', 'Sipping', 'Resting'], library: ['Reading', 'Writing', 'Browsing'] };
const SPACES: CompanionSpace[] = ['cafe', 'library'];

// List kept for the session (reloading only reshuffles seats)
let roster: { mine: CharacterId; list: Companion[] } | null = null;

export function getCompanions(mine: CharacterId): Companion[] {
  if (roster?.mine === mine) return roster.list;
  const count = getCompanionCount() ?? 0;
  // Avoid the same look as my character. With 4, the last one is premium Cloudy
  const looks = PLAYABLE.filter((c) => c.id !== mine);
  const first = Math.random() < 0.5 ? 0 : 1;
  const list: Companion[] = [];
  for (let i = 0; i < Math.min(count, 3); i++) {
    const space = SPACES[(first + i) % 2];
    list.push({ id: NAMES[i].toLowerCase(), name: NAMES[i], character: looks[i % looks.length], space, doing: DOING[space][i % 3] });
  }
  if (count >= 4 && mine !== 'cloudy') {
    const space = SPACES[Math.floor(Math.random() * 2)];
    list.push({ id: 'cloudy', name: 'Cloudy', character: CHARACTERS.find((c) => c.id === 'cloudy')!, space, doing: 'Floating by' });
  }
  roster = { mine, list };
  return list;
}

export const SPACE_NAME: Record<CompanionSpace, string> = { cafe: 'Café', library: 'Library' };
