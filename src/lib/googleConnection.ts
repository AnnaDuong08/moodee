import type { AgendaEvent, PlanInput } from './calendar';
import { supabase, supabaseUrl as url, supabasePublicKey as anonKey, authConfigured, beginGoogleOAuth, exchangeOAuthSession } from './auth';
export { safeAuthStorage } from './auth';
export const googleConfigured = authConfigured;

export class CalendarRequestError extends Error {
  constructor(message: string, public code?: string) { super(message); }
}

export async function callCalendar<T>(action: string, data: Record<string, unknown> = {}): Promise<T> {
  if (!supabase) throw new CalendarRequestError('Google Calendar needs project configuration.', 'unconfigured');
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session || session.user.is_anonymous) throw new CalendarRequestError('Connect Google Calendar first.', 'reconnect');
  let response: Response;
  try {
    response = await fetch(`${url}/functions/v1/calendar`, {
      method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...data }),
    });
  } catch {
    throw new CalendarRequestError('You appear to be offline. Showing the last saved agenda.', 'offline');
  }
  const result = await response.json().catch(() => ({})) as { error?: string; code?: string };
  if (!response.ok) throw new CalendarRequestError(result.error || 'Calendar request failed.', response.status >= 500 ? 'offline' : result.code);
  return result as T;
}

export async function beginGoogleConnection() {
  await beginGoogleOAuth('calendar');
}

export async function completeGoogleRedirect(): Promise<boolean> {
  const session = await exchangeOAuthSession();
  if (!session) return false;
  const refresh = session.provider_refresh_token;
  if (!refresh) throw new CalendarRequestError('Google did not grant offline access. Please reconnect and approve Calendar access.', 'reconnect');
  await callCalendar('connect', { providerRefreshToken: refresh });
  return true;
}

export async function currentAccountId(): Promise<string | null> {
  const { data } = await supabase?.auth.getSession() ?? { data: { session: null } };
  return data.session?.user.is_anonymous ? null : data.session?.user.id ?? null;
}

export async function connectionStatus(): Promise<{ connected: boolean; email: string | null }> {
  if (!supabase) return { connected: false, email: null };
  const userId = await currentAccountId();
  if (!userId) return { connected: false, email: null };
  return callCalendar('status');
}

export async function listGoogleAgenda(timeMin: string, timeMax: string): Promise<AgendaEvent[]> {
  const data = await callCalendar<{ events: AgendaEvent[] }>('agenda', { timeMin, timeMax });
  return data.events;
}

export async function createGooglePlan(plan: PlanInput & { id: string }): Promise<AgendaEvent> {
  const data = await callCalendar<{ event: AgendaEvent }>('create', { plan });
  return data.event;
}

export async function updateGooglePlan(event: AgendaEvent, plan: PlanInput): Promise<AgendaEvent> {
  const data = await callCalendar<{ event: AgendaEvent }>('update', {
    calendarId: event.calendarId, eventId: event.id, etag: event.etag,
    plan: { id: crypto.randomUUID(), ...plan },
  });
  return data.event;
}

export async function deleteGooglePlan(event: AgendaEvent): Promise<void> {
  await callCalendar('delete', { calendarId: event.calendarId, eventId: event.id, etag: event.etag });
}

export async function disconnectGoogle(): Promise<void> {
  await callCalendar('disconnect');
}
