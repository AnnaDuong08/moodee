// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { addDays, clearAccountCalendarCache, dueGuestPlans, getWeekDays, guestPlans, migrateUpcomingPlans, normalizeIntent, toAgendaEvent } from './calendar';

beforeEach(() => localStorage.clear());

describe('session intent', () => {
  it('rejects a blank goal after trimming', () => {
    expect(normalizeIntent('  \n  ')).toBeNull();
    expect(normalizeIntent('  Write intro  ')).toEqual({ text: 'Write intro' });
  });
});

describe('guest plans and weeks', () => {
  it('stores guest plans locally and navigates by seven days', () => {
    const plan = guestPlans.create({ title: 'Read chapter', startsAt: '2026-09-30T09:00:00.000Z', durationMinutes: 25, reminderMinutes: 10 });
    expect(guestPlans.list()).toEqual([plan]);
    expect(getWeekDays(new Date(2026, 8, 30))[0].getDay()).toBe(1);
    expect(addDays(getWeekDays(new Date(2026, 8, 30))[0], 7).getDate()).toBe(5);
    guestPlans.remove(plan.id);
    expect(guestPlans.list()).toEqual([]);
  });

  it('keeps a failed migration plan and does not duplicate one already created', async () => {
    const first = guestPlans.create({ title: 'First', startsAt: '2026-10-02T09:00:00.000Z', durationMinutes: 25, reminderMinutes: 10 });
    const second = guestPlans.create({ title: 'Second', startsAt: '2026-10-03T09:00:00.000Z', durationMinutes: 25, reminderMinutes: 10 });
    let calls = 0;
    const result = await migrateUpcomingPlans(guestPlans.list(), async () => {
      calls += 1;
      if (calls === 2) throw new Error('offline');
    }, new Date('2026-10-01T00:00:00.000Z'));
    expect(result).toEqual({ migrated: 1, failed: 1 });
    expect(guestPlans.list().map((plan) => plan.id)).toEqual([second.id]);
    expect(guestPlans.list().some((plan) => plan.id === first.id)).toBe(false);
  });

  it('marks guest reminders only during their due window in the game', () => {
    const plan = guestPlans.create({ title: 'Start notes', startsAt: '2026-10-01T10:00:00.000Z', durationMinutes: 25, reminderMinutes: 10 });
    expect(dueGuestPlans(new Date('2026-10-01T09:49:00.000Z'))).toEqual([]);
    expect(dueGuestPlans(new Date('2026-10-01T09:51:00.000Z'))).toEqual([plan]);
    expect(dueGuestPlans(new Date('2026-10-01T10:00:00.000Z'))).toEqual([]);
  });
});

it('marks other Google calendars read only', () => {
  expect(toAgendaEvent({ id: 'x', summary: 'Seminar', start: { dateTime: '2026-10-02T09:00:00Z' }, end: { dateTime: '2026-10-02T10:00:00Z' }, etag: 'v1' }, 'another', 'MOODEE', 'moodie')).toMatchObject({ title: 'Seminar', readOnly: true, source: 'google' });
});

it('clears only the disconnected account cached agenda', () => {
  localStorage.setItem('moodie:calendarCache:user-a:week', 'private-a');
  localStorage.setItem('moodie:calendarCache:user-b:week', 'private-b');
  clearAccountCalendarCache('user-a');
  expect(localStorage.getItem('moodie:calendarCache:user-a:week')).toBeNull();
  expect(localStorage.getItem('moodie:calendarCache:user-b:week')).toBe('private-b');
});
