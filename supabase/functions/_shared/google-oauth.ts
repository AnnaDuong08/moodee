import { GoogleApiError } from './calendar-api.ts';

export async function refreshGoogleAccessToken(refreshToken: string, clientId: string, clientSecret: string, fetcher: typeof fetch = fetch): Promise<{ access_token: string; refresh_token?: string }> {
  const response = await fetcher('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
  });
  if (!response.ok) throw new GoogleApiError(response.status === 400 ? 401 : 502, response.status === 400 ? 'Google access expired. Reconnect Google Calendar.' : 'Google sign-in is unavailable.');
  const data = await response.json() as { access_token?: string; refresh_token?: string };
  if (!data.access_token) throw new GoogleApiError(502, 'Google did not return access.');
  return { access_token: data.access_token, ...(data.refresh_token ? { refresh_token: data.refresh_token } : {}) };
}
