// 스트릭: 하루에 집중 세션을 1회 이상 끝내면 이어짐
import { load, save } from './storage';

interface StreakState {
  count: number;
  lastDate: string | null; // YYYY-MM-DD (로컬 기준)
  totalSessions: number;
}

const KEY = 'streak';
const EMPTY: StreakState = { count: 0, lastDate: null, totalSessions: 0 };

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const yesterdayKey = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayKey(d);
};

// 화면 표시용: 어제 이전에 끊겼다면 0으로 본다
export function readStreak() {
  const s = load<StreakState>(KEY, EMPTY);
  const today = dayKey(new Date());
  const alive = s.lastDate === today || s.lastDate === yesterdayKey();
  return { count: alive ? s.count : 0, doneToday: s.lastDate === today, totalSessions: s.totalSessions };
}

// 세션 완료 시 호출
export function completeSession() {
  const s = load<StreakState>(KEY, EMPTY);
  const today = dayKey(new Date());
  let count = s.count;
  if (s.lastDate !== today) count = s.lastDate === yesterdayKey() ? s.count + 1 : 1;
  save(KEY, { count, lastDate: today, totalSessions: s.totalSessions + 1 });
  return readStreak();
}
