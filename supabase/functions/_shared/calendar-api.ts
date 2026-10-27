export interface PlanPayload {
  id: string;
  title: string;
  startsAt: string;
  durationMinutes: number;
  reminderMinutes: null | 0 | 10 | 30 | 60;
}

interface GoogleEvent {
  id: string;
  summary?: string;
  status?: string;
  etag?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  reminders?: { overrides?: { method: string; minutes: number }[] };
}

export class GoogleApiError extends Error {
  constructor(public status: number, message: string, public reason?: string) { super(message); }
}
export class CalendarConflict extends GoogleApiError {
  constructor() { super(412, 'This event changed in Google Calendar. Refresh and repeat your edit.'); }
}

const API = 'https://www.googleapis.com/calendar/v3';
const VALID_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validatePlan(plan: PlanPayload): PlanPayload {
  const title = plan.title?.trim();
  if (!VALID_ID.test(plan.id) || !title || title.length > 300) throw new Error('Invalid plan goal or ID.');
  const start = new Date(plan.startsAt);
  if (!Number.isFinite(start.getTime()) || !Number.isInteger(plan.durationMinutes) || plan.durationMinutes < 1 || plan.durationMinutes > 720) throw new Error('Invalid plan time or duration.');
  if (![null, 0, 10, 30, 60].includes(plan.reminderMinutes)) throw new Error('Invalid reminder.');
  return { ...plan, title, startsAt: start.toISOString() };
}

export function eventBody(input: PlanPayload) {
  const plan = validatePlan(input);
  const start = new Date(plan.startsAt);
  const end = new Date(start.getTime() + plan.durationMinutes * 60_000);
  return {
    summary: plan.title,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
    reminders: { useDefault: false, overrides: plan.reminderMinutes === null ? [] : [
      { method: 'popup', minutes: plan.reminderMinutes },
      { method: 'email', minutes: plan.reminderMinutes },
    ] },
  };
}

export function stableEventId(clientId: string): string {
  if (!VALID_ID.test(clientId)) throw new Error('Invalid plan ID.');
  return `m${clientId.replaceAll('-', '').toLowerCase()}`;
}

function eventView(event: GoogleEvent, calendarId: string, calendarName: string, moodieCalendarId: string) {
  const startsAt = event.start?.dateTime ?? event.start?.date;
  const endsAt = event.end?.dateTime ?? event.end?.date;
  if (!event.id || !startsAt || !endsAt || event.status === 'cancelled') return null;
  const own = calendarId === moodieCalendarId;
  const minutes = event.reminders?.overrides?.find((reminder) => reminder.method === 'popup')?.minutes;
  return {
    id: event.id, calendarId, calendarName,
    title: event.summary?.trim() || '(Untitled event)', startsAt, endsAt,
    source: own ? 'moodie' : 'google', readOnly: !own, etag: event.etag,
    reminderMinutes: minutes === 0 || minutes === 10 || minutes === 30 || minutes === 60 ? minutes : null,
  };
}

export class GoogleCalendarApi {
  constructor(private token: string, private fetcher: typeof fetch = fetch) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.fetcher(`${API}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json', ...init.headers },
    });
    if (response.status === 412) throw new CalendarConflict();
    if (!response.ok) {
      // Google's reason code identifies disabled APIs, missing scopes, and account
      // restrictions without exposing OAuth tokens or event contents to the UI.
      const body = await response.json().catch(() => null) as {
        error?: { errors?: { reason?: string }[]; details?: { reason?: string }[]; status?: string }
      } | null;
      const rawReason = body?.error?.details?.find((item) => item.reason)?.reason
        ?? body?.error?.errors?.find((item) => item.reason)?.reason
        ?? body?.error?.status;
      const reason = rawReason && /^[A-Za-z][A-Za-z0-9_.]{0,63}$/.test(rawReason) ? rawReason : undefined;
      const operation = path.startsWith('/users/me/calendarList') ? 'list calendars'
        : path === '/calendars' ? 'create calendar'
        : path.includes('/events') ? 'access events' : 'access calendar';
      const detail = reason ? `: ${reason}` : '';
      throw new GoogleApiError(response.status, `Google Calendar could not ${operation} (${response.status}${detail}).`, reason);
    }
    if (response.status === 204) return undefined as T;
    return await response.json() as T;
  }

  async createCalendar(): Promise<string> {
    const calendar = await this.request<{ id: string }>('/calendars', { method: 'POST', body: JSON.stringify({ summary: 'MOODEE', description: 'Study plans created in MOODEE' }) });
    return calendar.id;
  }

  async findOrCreateCalendar(): Promise<string> {
    const calendars = await this.listPages<{ id: string; summary?: string; description?: string; accessRole?: string }>('/users/me/calendarList');
    const existing = calendars.find((calendar) => calendar.summary === 'MOODEE' && calendar.description === 'Study plans created in MOODEE' && calendar.accessRole === 'owner');
    return existing?.id ?? this.createCalendar();
  }

  async getEvent(calendarId: string, eventId: string) {
    const event = await this.request<GoogleEvent>(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`);
    return eventView(event, calendarId, 'MOODEE', calendarId);
  }

  async createPlan(calendarId: string, input: PlanPayload) {
    const id = stableEventId(input.id);
    try {
      const event = await this.request<GoogleEvent>(`/calendars/${encodeURIComponent(calendarId)}/events`, {
        method: 'POST', body: JSON.stringify({ ...eventBody(input), id }),
      });
      return eventView(event, calendarId, 'MOODEE', calendarId);
    } catch (error) {
      if (error instanceof GoogleApiError && error.status === 409) return await this.getEvent(calendarId, id);
      throw error;
    }
  }

  async updatePlan(calendarId: string, eventId: string, etag: string, input: PlanPayload) {
    if (!etag) throw new Error('Refresh before editing this event.');
    const event = await this.request<GoogleEvent>(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
      method: 'PATCH', headers: { 'If-Match': etag }, body: JSON.stringify(eventBody(input)),
    });
    return eventView(event, calendarId, 'MOODEE', calendarId);
  }

  async deletePlan(moodieCalendarId: string, targetCalendarId: string, eventId: string, etag: string) {
    if (targetCalendarId !== moodieCalendarId) throw new Error('Other Google calendars are read-only.');
    if (!etag) throw new Error('Refresh before deleting this event.');
    await this.request<void>(`/calendars/${encodeURIComponent(moodieCalendarId)}/events/${encodeURIComponent(eventId)}`, { method: 'DELETE', headers: { 'If-Match': etag } });
  }

  private async listPages<T>(path: string): Promise<T[]> {
    const items: T[] = [];
    let pageToken: string | undefined;
    do {
      const separator = path.includes('?') ? '&' : '?';
      const result: { items?: T[]; nextPageToken?: string } = await this.request(`${path}${pageToken ? `${separator}pageToken=${encodeURIComponent(pageToken)}` : ''}`);
      items.push(...(result.items ?? []));
      pageToken = result.nextPageToken;
    } while (pageToken);
    return items;
  }

  async listAgenda(moodieCalendarId: string, timeMin: string, timeMax: string) {
    const calendars = await this.listPages<{ id: string; summary?: string; accessRole?: string }>('/users/me/calendarList');
    if (!calendars.some((calendar) => calendar.id === moodieCalendarId)) calendars.push({ id: moodieCalendarId, summary: 'MOODEE' });
    const all = await Promise.all(calendars.map(async (calendar) => {
      const query = new URLSearchParams({ timeMin, timeMax, singleEvents: 'true', orderBy: 'startTime', maxResults: '2500' });
      try {
        const events = await this.listPages<GoogleEvent>(`/calendars/${encodeURIComponent(calendar.id)}/events?${query}`);
        return events.map((event) => eventView(event, calendar.id, calendar.summary || 'Google Calendar', moodieCalendarId)).filter((event): event is NonNullable<typeof event> => event !== null);
      } catch (error) {
        if (calendar.id !== moodieCalendarId && error instanceof GoogleApiError && error.status === 403) return [];
        throw error;
      }
    }));
    return all.flat().sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }
}
