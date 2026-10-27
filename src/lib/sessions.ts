// Focus session log: saves the topic chosen in "What are you studying?" and the minutes actually focused → Records stats
import { loadValue, save } from './storage';

export interface Session {
  id: string;
  subject: string;
  minutes: number;
  endedAt: string; // ISO
  seat: string;
  friction?: number; // Starting difficulty 1 (easy) – 5 (hard) — one tap after the session
}

const KEY = 'sessions';

// Default topic chips (sticky-note examples: coding, chem, reading + assignment)
export const SUBJECT_PRESETS = ['Coding', 'Chemistry', 'Reading', 'Assignment', 'Math', 'Design'];

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const listSessions = () => loadValue<Session[]>(KEY, []);

export function addSession(s: Omit<Session, 'id' | 'endedAt'>) {
  const all = listSessions();
  const session: Session = { ...s, id: `${Date.now()}`, endedAt: new Date().toISOString() };
  save(KEY, [...all, session]);
  // Custom topics are shown again as chips next time
  if (!SUBJECT_PRESETS.includes(s.subject)) {
    const mine = loadValue<string[]>('subjects', []).filter((x) => x !== s.subject);
    save('subjects', [s.subject, ...mine].slice(0, 4));
  }
  return session;
}

export const setFriction = (id: string, friction: number) => save(KEY, listSessions().map((x) => (x.id === id ? { ...x, friction } : x)));

export const customSubjects = () => loadValue<string[]>('subjects', []);

// Totals per topic over the last 7 days (including today), largest first
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

// Totals per weekday over the last 7 days (for the bar chart)
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

// Number of days studied this month (membership progress)
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
