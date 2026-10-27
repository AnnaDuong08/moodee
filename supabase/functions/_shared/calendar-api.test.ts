import { describe, expect, it, vi } from 'vitest';
import { CalendarConflict, GoogleApiError, GoogleCalendarApi } from './calendar-api';

const plan = { id: '9a762cbd-3225-4e48-97dc-10fd20968604', title: 'Write intro', startsAt: '2026-10-01T09:00:00.000Z', durationMinutes: 25, reminderMinutes: 10 as const };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

it('creates a MOODEE event with popup and email reminders and stable id', async () => {
  const fetcher = vi.fn(async (_url: string, _init?: RequestInit) => json({ id: 'm9a762cbd32254e4897dc10fd20968604', ...plan, etag: 'v1', start: { dateTime: plan.startsAt }, end: { dateTime: '2026-10-01T09:25:00.000Z' } }));
  const api = new GoogleCalendarApi('token', fetcher);
  await api.createPlan('moodie-cal', plan);
  const [url, init] = fetcher.mock.calls[0];
  expect(url).toContain('/calendars/moodie-cal/events');
  expect(JSON.parse(String(init?.body))).toMatchObject({ id: 'm9a762cbd32254e4897dc10fd20968604', reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 10 }, { method: 'email', minutes: 10 }] } });
});

it('uses If-Match for edits and reports a conflict', async () => {
  const fetcher = vi.fn(async () => json({ error: 'precondition' }, 412));
  const api = new GoogleCalendarApi('token', fetcher);
  await expect(api.updatePlan('moodie-cal', 'event', 'old-etag', plan)).rejects.toBeInstanceOf(CalendarConflict);
  expect(fetcher.mock.calls[0][1]?.headers).toMatchObject({ 'If-Match': 'old-etag' });
});

it('reports the Google operation and safe reason for a 403 without exposing response data', async () => {
  const fetcher = vi.fn(async () => json({ error: { message: 'private account data', details: [{ reason: 'SERVICE_DISABLED' }] } }, 403));
  const api = new GoogleCalendarApi('secret-token', fetcher);
  const error = await api.findOrCreateCalendar().catch((failure: unknown) => failure) as GoogleApiError;
  expect(error).toBeInstanceOf(GoogleApiError);
  expect(error.message).toBe('Google Calendar could not list calendars (403: SERVICE_DISABLED).');
  expect(error.message).not.toContain('private account data');
  expect(error.message).not.toContain('secret-token');
});

it('refuses to mutate a calendar other than the dedicated calendar', async () => {
  const fetcher = vi.fn();
  const api = new GoogleCalendarApi('token', fetcher);
  await expect(api.deletePlan('moodie-cal', 'other-cal', 'event', 'etag')).rejects.toThrow('read-only');
  expect(fetcher).not.toHaveBeenCalled();
});

it('returns a changed week without deleted events or tokens', async () => {
  const fetcher = vi.fn(async (url: string) => url.includes('calendarList')
    ? json({ items: [{ id: 'moodie-cal', summary: 'MOODEE' }, { id: 'personal', summary: 'Personal' }] })
    : url.includes('moodie-cal')
      ? json({ items: [{ id: 'a', summary: 'Latest', start: { dateTime: plan.startsAt }, end: { dateTime: '2026-10-01T09:25:00Z' } }, { id: 'gone', status: 'cancelled' }] })
      : json({ items: [{ id: 'b', summary: 'Meeting', start: { dateTime: plan.startsAt }, end: { dateTime: '2026-10-01T10:00:00Z' } }] }));
  const api = new GoogleCalendarApi('secret-token', fetcher);
  const events = await api.listAgenda('moodie-cal', '2026-09-28T00:00:00Z', '2026-10-05T00:00:00Z');
  expect(events).toHaveLength(2);
  expect(events.find((event) => event.id === 'b')?.readOnly).toBe(true);
  expect(JSON.stringify(events)).not.toContain('secret-token');
});

it('reuses its existing secondary calendar after reconnecting', async () => {
  const fetcher = vi.fn(async () => json({ items: [{ id: 'old-moodie', summary: 'MOODEE', description: 'Study plans created in MOODEE', accessRole: 'owner' }] }));
  const api = new GoogleCalendarApi('token', fetcher);
  expect(await api.findOrCreateCalendar()).toBe('old-moodie');
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('turns reminders off on update and deletes only with a matching ETag', async () => {
  const fetcher = vi.fn(async (_url: string, init?: RequestInit) => init?.method === 'DELETE' ? new Response(null, { status: 204 }) : json({ id: 'event', summary: 'Changed', start: { dateTime: plan.startsAt }, end: { dateTime: '2026-10-01T09:25:00Z' }, etag: 'v2' }));
  const api = new GoogleCalendarApi('token', fetcher);
  await api.updatePlan('moodie-cal', 'event', 'v1', { ...plan, title: 'Changed', reminderMinutes: null });
  expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body)).reminders).toEqual({ useDefault: false, overrides: [] });
  await api.deletePlan('moodie-cal', 'moodie-cal', 'event', 'v2');
  expect(fetcher.mock.calls[1][1]).toMatchObject({ method: 'DELETE', headers: { 'If-Match': 'v2' } });
});

it('treats a repeated create ID as the same Google event', async () => {
  const fetcher = vi.fn(async (_url: string, init?: RequestInit) => init?.method === 'POST' ? json({ error: 'duplicate' }, 409) : json({ id: 'm9a762cbd32254e4897dc10fd20968604', summary: plan.title, start: { dateTime: plan.startsAt }, end: { dateTime: '2026-10-01T09:25:00Z' } }));
  const api = new GoogleCalendarApi('token', fetcher);
  expect(await api.createPlan('moodie-cal', plan)).toMatchObject({ title: plan.title });
  expect(fetcher).toHaveBeenCalledTimes(2);
});
