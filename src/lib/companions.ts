// 데모 동행(autonomous demo NPC companions): 실제 멀티플레이가 아니라, 처음 한 번 정한 인원수로 친구 명단을 만든다
// 친구들은 세션마다 여러 공간에 흩어져 있고, 그 공간에 들어가면 NPC로 만난다
import { CHARACTERS, PLAYABLE, type Character, type CharacterId } from '../data/characters';
import { loadValue, save } from './storage';

export type CompanionSpace = 'cafe' | 'library';
export interface Companion {
  id: string;
  name: string;
  character: Character;
  space: CompanionSpace;
  doing: string; // 그 공간에서 하는 일(이름표)
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

// 세션 동안 유지되는 명단(새로고침하면 자리만 다시 섞인다)
let roster: { mine: CharacterId; list: Companion[] } | null = null;

export function getCompanions(mine: CharacterId): Companion[] {
  if (roster?.mine === mine) return roster.list;
  const count = getCompanionCount() ?? 0;
  // 내 캐릭터와 같은 모습은 피한다. 4명이면 마지막 한 명은 프리미엄 Cloudy
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
