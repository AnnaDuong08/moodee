// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { safeAuthStorage } from './googleConnection';

it('does not persist Google provider tokens in browser storage', () => {
  const storage = safeAuthStorage(localStorage);
  storage.setItem('session', JSON.stringify({ access_token: 'supabase-jwt', provider_token: 'google-access', provider_refresh_token: 'google-refresh' }));
  expect(localStorage.getItem('session')).toContain('supabase-jwt');
  expect(localStorage.getItem('session')).not.toContain('google-access');
  expect(localStorage.getItem('session')).not.toContain('google-refresh');
});
