// 같은 교실에서 공부 중인 사람들(데모용 고정 데이터).
// 실제 다른 사용자는 서버가 필요하므로, 지금은 "누가 무엇을 공부 중인지 보이는" 경험만 보여 준다.
import { PLAYABLE as CHARACTERS, type Character, type CharacterId } from './characters';

export interface Classmate {
  id: string;
  name: string;
  subject: string;
  topSeat: string; // 탑뷰 좌석 ID (SeatPicker)
  // 눈높이 뷰에서 앉는 의자(이미지 px): 줄, 의자 중심 x, 엉덩이 높이, 캐릭터 컷 높이 비율
  back: { row: 1 | 2; x: number; hipY: number; h: number };
}

export const CLASSMATES: Classmate[] = [
  { id: 'hieu', name: 'Hieu', subject: 'Coding', topSeat: '2B', back: { row: 2, x: 262, hipY: 752, h: 0.225 } },
  { id: 'chi', name: 'Chi', subject: 'Reading', topSeat: '1C', back: { row: 1, x: 664, hipY: 620, h: 0.178 } },
  { id: 'luna', name: 'Luna', subject: 'Chemistry', topSeat: '2D', back: { row: 2, x: 874, hipY: 752, h: 0.225 } },
];

// 내 캐릭터를 뺀 나머지 캐릭터를 친구들에게 차례로 배정
export function classmateLooks(mine: CharacterId): Record<string, Character> {
  const rest = CHARACTERS.filter((c) => c.id !== mine);
  return Object.fromEntries(CLASSMATES.map((m, i) => [m.id, rest[i % rest.length]]));
}
