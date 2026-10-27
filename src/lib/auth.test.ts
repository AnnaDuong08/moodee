// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
const calls=vi.hoisted(()=>({getSession:vi.fn(),signInAnonymously:vi.fn(),signInWithOAuth:vi.fn(),exchangeCodeForSession:vi.fn()}));
vi.mock('@supabase/supabase-js',()=>({createClient:()=>({auth:calls})}));
afterEach(()=>{vi.resetModules();vi.unstubAllEnvs();sessionStorage.clear();window.history.replaceState({},'','/');});
async function auth(){vi.stubEnv('VITE_SUPABASE_URL','https://test.supabase.co');vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY','public');return import('./auth');}
it('Tutor Google sign-in requests identity only and records its callback destination',async()=>{
  calls.signInWithOAuth.mockResolvedValue({error:null});
  const api=await auth(); await api.beginGoogleOAuth('tutor');
  expect(calls.signInWithOAuth.mock.lastCall?.[0].options.scopes).toBe('openid email profile');
  expect(api.oauthDestination()).toBe('tutor');
});
it('reuses account sessions and creates guest access without a CAPTCHA or manual login',async()=>{
  const api=await auth(); const session={user:{id:'google'}};
  calls.getSession.mockResolvedValue({data:{session}});
  expect(await api.tutorIdentity()).toBe(session);
  calls.getSession.mockResolvedValue({data:{session:null}});
  calls.signInAnonymously.mockResolvedValue({data:{session:{user:{id:'guest',is_anonymous:true}}},error:null});
  expect((await api.tutorIdentity()).user.id).toBe('guest');
  expect(calls.signInAnonymously.mock.lastCall).toEqual([]);
});
it('exchanges Tutor callbacks without Calendar tokens and removes the OAuth code',async()=>{
  const api=await auth(); window.history.replaceState({},'','/?code=oauth-code&oauth_destination=tutor');
  calls.exchangeCodeForSession.mockResolvedValue({data:{session:{user:{id:'google'}}},error:null});
  expect((await api.exchangeOAuthSession())?.user.id).toBe('google');
  expect(window.location.search).toBe('');
});
