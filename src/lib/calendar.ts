import { loadValue, save } from './storage';

export type ReminderMinutes = null | 0 | 10 | 30 | 60;

export interface PlanInput {
  title: string;
  startsAt: string;
  durationMinutes: number;
  reminderMinutes: ReminderMinutes;
}

export interface StudyPlan extends PlanInput {
  id: string;
  source: 'local' | 'google';
  etag?: string;
}

export interface AgendaEvent {
  id: string;
  calendarId: string;
  calendarName: string;
  title: string;
  startsAt: string;
  endsAt: string;
  source: 'moodie' | 'google';
  readOnly: boolean;
  etag?: string;
  reminderMinutes?: ReminderMinutes;
}

export interface SessionIntent {
  text: string;
  sourceEventId?: string;
}

export interface GoogleEvent {
  id?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  etag?: string;
  reminders?: { useDefault?: boolean; overrides?: { method: string; minutes: number }[] };
}

const STORAGE_KEY = 'guestPlans';

export function normalizeIntent(text: string, sourceEventId?: string): SessionIntent | null {
  const trimmed = text.trim();
  return trimmed ? { text: trimmed, ...(sourceEventId ? { sourceEventId } : {}) } : null;
}

export function addDays(date: Date, count: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + count);
  return next;
}

export function getWeekDays(date: Date): Date[] {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

export function localDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toAgendaEvent(event: GoogleEvent, calendarId: string, calendarName: string, moodieCalendarId: string): AgendaEvent | null {
  const startsAt = event.start?.dateTime ?? event.start?.date;
  const endsAt = event.end?.dateTime ?? event.end?.date;
  if (!event.id || !startsAt || !endsAt) return null;
  const own = calendarId === moodieCalendarId;
  const reminder = event.reminders?.overrides?.find((value) => value.method === 'popup')?.minutes;
  return {
    id: event.id,
    calendarId,
    calendarName,
    title: event.summary?.trim() || '(Untitled event)',
    startsAt,
    endsAt,
    source: own ? 'moodie' : 'google',
    readOnly: !own,
    etag: event.etag,
    reminderMinutes: reminder === 0 || reminder === 10 || reminder === 30 || reminder === 60 ? reminder : null,
  };
}

function readPlans(): StudyPlan[] {
  const raw = loadValue<unknown>(STORAGE_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter((plan): plan is StudyPlan => Boolean(plan && typeof plan === 'object' && typeof plan.id === 'string' && typeof plan.title === 'string' && typeof plan.startsAt === 'string' && plan.source === 'local'));
}

export const guestPlans = {
  list: readPlans,
  create(input: PlanInput): StudyPlan {
    const plan: StudyPlan = { ...input, title: input.title.trim(), id: crypto.randomUUID(), source: 'local' };
    if (!plan.title) throw new Error('A plan needs a goal.');
    save(STORAGE_KEY, [...readPlans(), plan]);
    return plan;
  },
  update(id: string, input: PlanInput): StudyPlan {
    const plan = readPlans().find((item) => item.id === id);
    if (!plan) throw new Error('Plan not found.');
    const updated = { ...plan, ...input, title: input.title.trim() };
    if (!updated.title) throw new Error('A plan needs a goal.');
    save(STORAGE_KEY, readPlans().map((item) => item.id === id ? updated : item));
    return updated;
  },
  remove(id: string): void {
    save(STORAGE_KEY, readPlans().filter((plan) => plan.id !== id));
  },
};

export function dueGuestPlans(now = new Date()): StudyPlan[] {
  const timestamp = now.getTime();
  return guestPlans.list().filter((plan) => {
    if (plan.reminderMinutes === null) return false;
    const startsAt = new Date(plan.startsAt).getTime();
    return timestamp >= startsAt - plan.reminderMinutes * 60_000 && timestamp < startsAt;
  });
}

export function clearAccountCalendarCache(accountId: string): void {
  try {
    const prefix = `moodie:calendarCache:${accountId}:`;
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(prefix)) localStorage.removeItem(key);
    }
    localStorage.removeItem(`moodie:calendarConnected:${accountId}`);
  } catch { /* Private browsing may block storage. */ }
}

export async function migrateUpcomingPlans(plans: StudyPlan[], createRemote: (plan: StudyPlan) => Promise<unknown>, now = new Date()): Promise<{ migrated: number; failed: number }> {
  let migrated = 0;
  let failed = 0;
  for (const plan of plans) {
    if (new Date(plan.startsAt).getTime() < now.getTime()) continue;
    try {
      await createRemote(plan);
      guestPlans.remove(plan.id);
      migrated += 1;
    } catch {
      failed += 1;
    }
  }
  return { migrated, failed };
}
