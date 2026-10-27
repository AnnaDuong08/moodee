import { expect, it } from 'vitest';
import { decryptRefreshToken, encryptRefreshToken } from './token-crypto';

const key = btoa(String.fromCharCode(...new Uint8Array(32).fill(7)));

it('encrypts a refresh token and binds it to one Supabase user', async () => {
  const ciphertext = await encryptRefreshToken('google-refresh-secret', 'user-a', key);
  expect(ciphertext).not.toContain('google-refresh-secret');
  expect(await decryptRefreshToken(ciphertext, 'user-a', key)).toBe('google-refresh-secret');
  await expect(decryptRefreshToken(ciphertext, 'user-b', key)).rejects.toThrow();
});
