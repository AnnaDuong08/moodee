import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabasePublicKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
export const authConfigured = Boolean(supabaseUrl && supabasePublicKey);
export type OAuthDestination = 'calendar' | 'tutor';

export function safeAuthStorage(storage: Storage): Storage {
  return {
    get length() { return storage.length; }, clear: () => storage.clear(), key: index => storage.key(index),
    getItem: key => storage.getItem(key), removeItem: key => storage.removeItem(key),
    setItem(key, value) {
      try {
        const parsed = JSON.parse(value) as Record<string, unknown>;
        if (parsed && typeof parsed === 'object') {
          delete parsed.provider_token; delete parsed.provider_refresh_token;
          storage.setItem(key, JSON.stringify(parsed)); return;
        }
      } catch { /* Non-JSON values pass through. */ }
      storage.setItem(key, value);
    },
  };
}
function availableStorage(): Storage {
  try { return window.localStorage; } catch {
    const values = new Map<string, string>();
    return { get length() { return values.size; }, clear: () => values.clear(), key: n => [...values.keys()][n] ?? null,
      getItem: k => values.get(k) ?? null, removeItem: k => { values.delete(k); }, setItem: (k, v) => { values.set(k, v); } };
  }
}
export const supabase: SupabaseClient | null = authConfigured ? createClient(supabaseUrl, supabasePublicKey, {
  auth: { flowType: 'pkce', detectSessionInUrl: false, storage: safeAuthStorage(availableStorage()), persistSession: true },
}) : null;

export function oauthDestination(): OAuthDestination {
  const marker=new URLSearchParams(window.location.search).get('oauth_destination');
  if(marker==='tutor' || marker==='calendar') return marker;
  try { return sessionStorage.getItem('moodee:oauth-destination') === 'tutor' ? 'tutor' : 'calendar'; } catch { return 'calendar'; }
}
export async function beginGoogleOAuth(destination: OAuthDestination) {
  if (!supabase) throw new Error('Google sign-in needs project configuration.');
  // Query marker survives browsers that discard sessionStorage during OAuth.
  const redirect = new URL(window.location.origin + window.location.pathname);
  redirect.searchParams.set('oauth_destination', destination);
  try { sessionStorage.setItem('moodee:oauth-destination', destination); } catch { /* URL marker remains. */ }
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: {
    scopes: destination === 'calendar' ? 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.app.created' : 'openid email profile',
    redirectTo: redirect.href,
    ...(destination === 'calendar' ? { queryParams: { access_type: 'offline', prompt: 'consent' } } : {}),
  } });
  if (error) throw new Error(error.message);
}
export async function exchangeOAuthSession() {
  if (!supabase) throw new Error('Google sign-in needs project configuration.');
  const address = new URL(window.location.href);
  const code = address.searchParams.get('code');
  if (!code) return null;
  address.searchParams.delete('code'); address.searchParams.delete('oauth_destination');
  window.history.replaceState({}, '', address.pathname + address.search + address.hash);
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw new Error('Google sign-in failed. Please try again.');
  try { sessionStorage.removeItem('moodee:oauth-destination'); } catch { /* Optional. */ }
  return data.session;
}
export async function tutorIdentity() {
  if (!supabase) throw new Error('Tutor unavailable. Project configuration is missing.');
  const { data: existing } = await supabase.auth.getSession();
  if (existing.session) return existing.session;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.session) throw new Error('Could not start guest access. Please try again later.');
  return data.session;
}
