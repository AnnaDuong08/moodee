import { expect, it, vi } from 'vitest';
import { GoogleApiError } from './calendar-api';
import { refreshGoogleAccessToken } from './google-oauth';

it('asks the user to reconnect when a Testing-mode refresh token expires', async () => {
  const fetcher = vi.fn(async () => new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 }));
  await expect(refreshGoogleAccessToken('expired', 'client', 'secret', fetcher)).rejects.toMatchObject({ status: 401 } satisfies Partial<GoogleApiError>);
});

it('returns only a fresh access token and optional rotated refresh token', async () => {
  const fetcher = vi.fn(async () => new Response(JSON.stringify({ access_token: 'new-access', refresh_token: 'rotated' }), { status: 200 }));
  expect(await refreshGoogleAccessToken('old', 'client', 'secret', fetcher)).toEqual({ access_token: 'new-access', refresh_token: 'rotated' });
  expect(String(fetcher.mock.calls[0][0])).toContain('oauth2.googleapis.com/token');
});
