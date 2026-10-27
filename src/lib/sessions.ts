// 집중 세션 기록: "What are you studying?"에서 고른 주제와 실제 집중한 분을 저장 → Records 통계
import { loadValue, save } from './storage';

export interface Session {
  id: string;
  subject: string;
  minutes: number;
  endedAt: string; // ISO
  seat: string;
  friction?: number; // 시작 부담 1(쉬움)~5(어려움) — 세션 뒤 한 번 탭
}

const KEY = 'sessions';

// 기본 주제 칩(포스트잇 예시: coding, chem, reading + 과제)
export const SUBJECT_PRESETS = ['Coding', 'Chemistry', 'Reading', 'Assignment', 'Math', 'Design'];

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const listSessions = () => loadValue<Session[]>(KEY, []);

export function addSession(s: Omit<Session, 'id' | 'endedAt'>) {
  const all = listSessions();
  const session: Session = { ...s, id: `${Date.now()}`, endedAt: new Date().toISOString() };
  save(KEY, [...all, session]);
  // 직접 입력한 주제는 다음에 칩으로 다시 보여줌
  if (!SUBJECT_PRESETS.includes(s.subject)) {
    const mine = loadValue<string[]>('subjects', []).filter((x) => x !== s.subject);
    save('subjects', [s.subject, ...mine].slice(0, 4));
  }
  return session;
}

export const setFriction = (id: string, friction: number) => save(KEY, listSessions().map((x) => (x.id === id ? { ...x, friction } : x)));

export const customSubjects = () => loadValue<string[]>('subjects', []);

// 최근 7일(오늘 포함) 주제별 합계, 많은 순
export function weekBySubject() {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - 6);
  const map = new Map<string, number>();
  for (const s of listSessions()) {
    if (new Date(s.endedAt) < from) continue;
    map.set(s.subject, (map.get(s.subject) ?? 0) + s.minutes);
  }
  return [...map.entries()].map(([subject, minutes]) => ({ subject, minutes })).sort((a, b) => b.minutes - a.minutes);
}

// 최근 7일 요일별 합계(막대 그래프용)
export function weekByDay() {
  const days: { label: string; key: string; minutes: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({ label: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()], key: dayKey(d), minutes: 0 });
  }
  for (const s of listSessions()) {
    const k = dayKey(new Date(s.endedAt));
    const hit = days.find((d) => d.key === k);
    if (hit) hit.minutes += s.minutes;
  }
  return days;
}

// 이번 달에 공부한 날 수(멤버십 진행도)
export function monthStudyDays() {
  const now = new Date();
  const set = new Set<string>();
  for (const s of listSessions()) {
    const d = new Date(s.endedAt);
    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) set.add(dayKey(d));
  }
  return set.size;
}

export const fmtMinutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`);
