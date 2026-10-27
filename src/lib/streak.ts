// Streak: continues if you finish at least one focus session per day
import { load, save } from './storage';

interface StreakState {
  count: number;
  lastDate: string | null; // YYYY-MM-DD (local time)
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

// For display: if it broke before yesterday, treat it as 0
export function readStreak() {
  const s = load<StreakState>(KEY, EMPTY);
  const today = dayKey(new Date());
  const alive = s.lastDate === today || s.lastDate === yesterdayKey();
  return { count: alive ? s.count : 0, doneToday: s.lastDate === today, totalSessions: s.totalSessions };
}

// Called on session completion
export function completeSession() {
  const s = load<StreakState>(KEY, EMPTY);
  const today = dayKey(new Date());
  let count = s.count;
  if (s.lastDate !== today) count = s.lastDate === yesterdayKey() ? s.count + 1 : 1;
  save(KEY, { count, lastDate: today, totalSessions: s.totalSessions + 1 });
  return readStreak();
}
