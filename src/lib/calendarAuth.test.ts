// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
const client = vi.hoisted(() => ({auth:{getSession:vi.fn()},}));
vi.mock('./auth', () => ({supabase:client, supabaseUrl:'https://test.supabase.co', supabasePublicKey:'public', authConfigured:true, safeAuthStorage:()=>{}, beginGoogleOAuth:vi.fn(), exchangeOAuthSession:vi.fn()}));
import { currentAccountId } from './googleConnection';
it('treats anonymous Tutor accounts as Calendar guests', async () => {
  client.auth.getSession.mockResolvedValue({data:{session:{user:{id:'guest',is_anonymous:true}}}});
  expect(await currentAccountId()).toBeNull();
  client.auth.getSession.mockResolvedValue({data:{session:{user:{id:'google-user',is_anonymous:false}}}});
  expect(await currentAccountId()).toBe('google-user');
});
