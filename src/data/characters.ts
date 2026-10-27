// 캐릭터 시트 정의: 각 시트는 가로 4컷(앞/옆/뒤/반대 옆)이 같은 폭으로 나열됨
export type CharacterId = 'ponytail' | 'bob' | 'wavy' | 'curly-glasses' | 'cloudy';

export interface Character {
  id: CharacterId;
  name: string;
  vibe: string;
  sheet: string;
  // 플레이스홀더에 쓸 머리색 톤
  hair: string;
  premium?: boolean; // MOODEE PRO 전용: 지금은 고를 수 없고, 친구(NPC)로만 등장
}

const base = import.meta.env.BASE_URL;

// 순서는 원본 파일 번호(캐릭터/1.김다현 ~ 4.Nazan)를 따름
export const CHARACTERS: Character[] = [
  { id: 'bob', name: 'Dahyeon', vibe: 'Short hair, short breaks.', sheet: `${base}assets/characters/char-bob.png`, hair: '#3E3330' },
  { id: 'ponytail', name: 'Minkyung', vibe: 'Ties it up and gets it done.', sheet: `${base}assets/characters/char-ponytail.png`, hair: '#3B302C' },
  { id: 'wavy', name: 'Nier', vibe: 'Goes with the flow.', sheet: `${base}assets/characters/char-wavy.png`, hair: '#342A27' },
  { id: 'curly-glasses', name: 'Nazwan', vibe: 'Reads every footnote.', sheet: `${base}assets/characters/char-curly-glasses.png`, hair: '#3A302B' },
  { id: 'cloudy', name: 'Cloudy', vibe: 'The MOODEE cloud. Floats wherever you study.', sheet: `${base}assets/characters/char-cloudy.png`, hair: '#FFFFFF', premium: true },
];
// 플레이어가 고를 수 있는 캐릭터(프리미엄 제외)
export const PLAYABLE = CHARACTERS.filter((c) => !c.premium);

// 시트 내 컷 인덱스
export const POSE = { front: 0, side: 1, back: 2, sideAlt: 3 } as const;
export type Pose = keyof typeof POSE;

// 한 컷의 비율: prepare-assets에서 4컷을 각 400px 폭으로 재배치(1600×1086 ÷ 4)
export const CELL_ASPECT = 400 / 1086;

export const getCharacter = (id: CharacterId | null | undefined) =>
  CHARACTERS.find((c) => c.id === id) ?? PLAYABLE[0];
