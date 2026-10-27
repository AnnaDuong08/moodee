// Character sheet definitions: each sheet has 4 frames side by side at equal width (front/side/back/opposite side)
export type CharacterId = 'ponytail' | 'bob' | 'wavy' | 'curly-glasses' | 'cloudy';

export interface Character {
  id: CharacterId;
  name: string;
  vibe: string;
  sheet: string;
  // Hair color tone for the placeholder
  hair: string;
  premium?: boolean; // MOODEE PRO only: can't be chosen for now; appears only as a friend (NPC)
}

const base = import.meta.env.BASE_URL;

// Order follows the original file numbers (캐릭터/1.김다현 – 4.Nazan)
export const CHARACTERS: Character[] = [
  { id: 'bob', name: 'Dahyeon', vibe: 'Short hair, short breaks.', sheet: `${base}assets/characters/char-bob.png`, hair: '#3E3330' },
  { id: 'ponytail', name: 'Minkyung', vibe: 'Ties it up and gets it done.', sheet: `${base}assets/characters/char-ponytail.png`, hair: '#3B302C' },
  { id: 'wavy', name: 'Nier', vibe: 'Goes with the flow.', sheet: `${base}assets/characters/char-wavy.png`, hair: '#342A27' },
  { id: 'curly-glasses', name: 'Nazwan', vibe: 'Reads every footnote.', sheet: `${base}assets/characters/char-curly-glasses.png`, hair: '#3A302B' },
  { id: 'cloudy', name: 'Cloudy', vibe: 'The MOODEE cloud. Floats wherever you study.', sheet: `${base}assets/characters/char-cloudy.png`, hair: '#FFFFFF', premium: true },
];
// Characters the player can choose (excluding premium)
export const PLAYABLE = CHARACTERS.filter((c) => !c.premium);

// Frame index within the sheet
export const POSE = { front: 0, side: 1, back: 2, sideAlt: 3 } as const;
export type Pose = keyof typeof POSE;

// Aspect of one frame: prepare-assets re-lays the 4 frames at 400px wide each (1600×1086 ÷ 4)
export const CELL_ASPECT = 400 / 1086;

export const getCharacter = (id: CharacterId | null | undefined) =>
  CHARACTERS.find((c) => c.id === id) ?? PLAYABLE[0];
