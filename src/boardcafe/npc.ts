// NPC (Luna, Hieu): among playable moves, prefer one that completes a cloud > one that fills more slots; otherwise Pass
import type { Lang } from './i18n';
import { canPlace, type Pattern, type Tile } from './rules';

export interface NpcMove {
  tile: Tile;
  slot: number;
}

export function chooseMove(p: Pattern, filled: (Tile | null)[], hand: Tile[], rand = Math.random): NpcMove | null {
  let best: NpcMove | null = null;
  let bestScore = -Infinity;
  const empty = filled.filter((t) => !t).length;
  for (const tile of hand)
    for (let slot = 0; slot < p.slots.length; slot++) {
      if (!canPlace(p, filled, slot, tile)) continue;
      // Slots filled (always 1) + completion bonus + preference for filling slots with a fixed number first + a little randomness
      const score = 1 + (empty === 1 ? 10 : 0) + (p.slots[slot] !== null ? 0.5 : 0) + rand() * 0.3;
      if (score > bestScore) {
        bestScore = score;
        best = { tile, slot };
      }
    }
  return best;
}

export type { Lang };
const LINES: Record<string, Record<Lang, string[]>> = {
  place: { en: ['Nice!', 'There we go ☁️', 'This one fits!', 'Ta-da!'], ko: ['좋아!', '여기 쏙 ☁️', '이거 맞다!', '짠!'], ja: ['いいね！', 'ここにぴったり ☁️', 'これだ！', 'じゃーん！'], vi: ['Hay!', 'Vừa khít ☁️', 'Cái này hợp nè!', 'Tèn ten!'] },
  pass: { en: ['Hmm, I’ll draw one', 'Nothing yet… drawing!', 'Pass for now'], ko: ['음, 한 장 뽑을게', '아직 없어… 뽑기!', '이번엔 패스'], ja: ['うーん、1枚ひくね', 'まだないな… ひく！', '今回はパス'], vi: ['Hừm, mình rút một thẻ', 'Chưa có… rút thôi!', 'Lần này bỏ lượt'] },
  yourTurn: { en: ['Your turn ☁️', 'You got this!', 'Go ahead~'], ko: ['네 차례야 ☁️', '할 수 있어!', '천천히 해~'], ja: ['きみの番だよ ☁️', 'いけるよ！', 'ゆっくりでいいよ〜'], vi: ['Tới lượt bạn ☁️', 'Bạn làm được mà!', 'Cứ từ từ nha~'] },
  complete: { en: ['We made a cloud!', 'Yay, cloud!', 'So fluffy!'], ko: ['구름 완성!', '와, 구름이다!', '폭신폭신!'], ja: ['雲ができた！', 'やった、雲だ！', 'ふわふわ！'], vi: ['Xong một đám mây!', 'Yay, mây nè!', 'Mềm xốp quá!'] },
  cheer: { en: ['Nice one!', 'Good pick!', 'Ooh, perfect'], ko: ['좋았어!', '잘 골랐다!', '오, 완벽해'], ja: ['ナイス！', 'いい選択！', 'おお、かんぺき'], vi: ['Hay lắm!', 'Chọn khéo ghê!', 'Ồ, hoàn hảo'] },
  swap: { en: ['Let’s try another pattern'], ko: ['다른 패턴 해보자'], ja: ['ほかのパターンにしよう'], vi: ['Thử mẫu khác nhé'] },
  have: { en: ['I have a {n}!', 'I might have a {n}…'], ko: ['나 {n} 있어!', '{n} 있을지도…'], ja: ['{n} あるよ！', '{n} あるかも…'], vi: ['Mình có số {n}!', 'Hình như mình có số {n}…'] },
};
export const say = (kind: keyof typeof LINES, lang: Lang, n?: number) => {
  const pool = LINES[kind][lang];
  return pool[Math.floor(Math.random() * pool.length)].replace('{n}', String(n ?? ''));
};
