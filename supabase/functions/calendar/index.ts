import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import { CalendarConflict, GoogleApiError, GoogleCalendarApi, validatePlan, type PlanPayload } from '../_shared/calendar-api.ts';
import { refreshGoogleAccessToken } from '../_shared/google-oauth.ts';
import { decryptRefreshToken, encryptRefreshToken } from '../_shared/token-crypto.ts';

interface Connection {
  user_id: string;
  google_email: string;
  calendar_id: string;
  refresh_token_ciphertext: string;
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
const allowedOrigins = (Deno.env.get('APP_ORIGINS') ?? '').split(',').map((value) => value.trim()).filter(Boolean);
const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

function cors(origin: string | null): HeadersInit {
  return origin && allowedOrigins.includes(origin) ? {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  } : {};
}

function respond(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(origin), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}

const encryptionKey = Deno.env.get('GOOGLE_TOKEN_ENCRYPTION_KEY')!;

async function getConnection(userId: string): Promise<Connection | null> {
  const { data, error } = await admin.from('google_calendar_connections').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data as Connection | null;
}

async function getApi(connection: Connection) {
  const token = await refreshGoogleAccessToken(await decryptRefreshToken(connection.refresh_token_ciphertext, connection.user_id, encryptionKey), googleClientId, googleClientSecret);
  if (token.refresh_token) {
    const { error } = await admin.from('google_calendar_connections').update({ refresh_token_ciphertext: await encryptRefreshToken(token.refresh_token, connection.user_id, encryptionKey), updated_at: new Date().toISOString() }).eq('user_id', connection.user_id);
    if (error) throw error;
  }
  return new GoogleCalendarApi(token.access_token!);
}

async function userFromRequest(request: Request) {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error ? null : data.user;
}

function weekRange(body: Record<string, unknown>) {
  const start = new Date(String(body.timeMin ?? ''));
  const end = new Date(String(body.timeMax ?? ''));
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end.getTime() - start.getTime() > 31 * 86_400_000 || end <= start) throw new Error('Invalid agenda range.');
  return { start: start.toISOString(), end: end.toISOString() };
}

Deno.serve(async (request) => {
  const origin = request.headers.get('Origin');
  if (request.method === 'OPTIONS') return new Response(null, { status: allowedOrigins.includes(origin ?? '') ? 204 : 403, headers: cors(origin) });
  if (request.method !== 'POST' || (origin && !allowedOrigins.includes(origin))) return respond({ error: 'Forbidden' }, 403, origin);
  try {
    const user = await userFromRequest(request);
    if (!user) return respond({ error: 'Sign in required.' }, 401, origin);
    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action ?? '');
    if (action === 'status') {
      const connection = await getConnection(user.id);
      return respond({ connected: Boolean(connection), email: connection?.google_email ?? null }, 200, origin);
    }
    if (action === 'connect') {
      if (user.app_metadata?.provider !== 'google') throw new Error('Sign in with Google first.');
      const refreshToken = String(body.providerRefreshToken ?? '');
      if (!refreshToken) throw new Error('Google did not grant offline access. Reconnect and approve Calendar access.');
      const access = await refreshGoogleAccessToken(refreshToken, googleClientId, googleClientSecret);
      const identityResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${access.access_token}` } });
      if (!identityResponse.ok) throw new Error('Could not verify Google identity.');
      const identity = await identityResponse.json() as { email?: string; email_verified?: boolean };
      if (!identity.email_verified || identity.email?.toLowerCase() !== user.email?.toLowerCase()) throw new Error('Google account does not match the signed-in account.');
      const old = await getConnection(user.id);
      const api = new GoogleCalendarApi(access.access_token!);
      const calendarId = old?.calendar_id ?? await api.findOrCreateCalendar();
      const { error } = await admin.from('google_calendar_connections').upsert({ user_id: user.id, google_email: identity.email, calendar_id: calendarId, refresh_token_ciphertext: await encryptRefreshToken(access.refresh_token ?? refreshToken, user.id, encryptionKey), updated_at: new Date().toISOString() });
      if (error) throw error;
      return respond({ connected: true, email: identity.email }, 200, origin);
    }
    const connection = await getConnection(user.id);
    if (!connection) return respond({ error: 'Connect Google Calendar first.', code: 'reconnect' }, 401, origin);
    if (action === 'disconnect') {
      const refreshToken = await decryptRefreshToken(connection.refresh_token_ciphertext, user.id, encryptionKey);
      await fetch('https://oauth2.googleapis.com/revoke', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: refreshToken }) }).catch(() => undefined);
      const { error } = await admin.from('google_calendar_connections').delete().eq('user_id', user.id);
      if (error) throw error;
      return respond({ connected: false }, 200, origin);
    }
    const api = await getApi(connection);
    if (action === 'agenda') {
      const range = weekRange(body);
      return respond({ events: await api.listAgenda(connection.calendar_id, range.start, range.end) }, 200, origin);
    }
    if (action === 'create') {
      const plan = validatePlan(body.plan as unknown as PlanPayload);
      return respond({ event: await api.createPlan(connection.calendar_id, plan) }, 200, origin);
    }
    if (action === 'update') {
      if (body.calendarId !== connection.calendar_id) throw new Error('Other Google calendars are read-only.');
      const plan = validatePlan(body.plan as unknown as PlanPayload);
      return respond({ event: await api.updatePlan(connection.calendar_id, String(body.eventId ?? ''), String(body.etag ?? ''), plan) }, 200, origin);
    }
    if (action === 'delete') {
      await api.deletePlan(connection.calendar_id, String(body.calendarId ?? ''), String(body.eventId ?? ''), String(body.etag ?? ''));
      return respond({ deleted: true }, 200, origin);
    }
    return respond({ error: 'Unknown action.' }, 400, origin);
  } catch (error) {
    if (error instanceof CalendarConflict) return respond({ error: error.message, code: 'conflict' }, 409, origin);
    if (error instanceof GoogleApiError) return respond({ error: error.message, code: error.status === 401 ? 'reconnect' : 'google_error' }, error.status, origin);
    if (error instanceof Error && /^(Invalid|Other Google|Refresh before|Google did not grant|Google account|Sign in with Google)/.test(error.message)) return respond({ error: error.message }, 400, origin);
    console.error('Calendar function failed', error instanceof Error ? error.name : 'unknown');
    return respond({ error: 'Calendar is temporarily unavailable.' }, 503, origin);
  }
});
