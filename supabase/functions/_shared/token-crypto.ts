function keyBuffer(base64Key: string): ArrayBuffer {
  const raw = Uint8Array.from(atob(base64Key), (character) => character.charCodeAt(0));
  if (raw.length !== 32) throw new Error('Token encryption key must contain 32 bytes.');
  const buffer = new ArrayBuffer(32);
  new Uint8Array(buffer).set(raw);
  return buffer;
}

async function cryptKey(base64Key: string) {
  return crypto.subtle.importKey('raw', keyBuffer(base64Key), 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptRefreshToken(value: string, userId: string, base64Key: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(userId) }, await cryptKey(base64Key), new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...iv, ...new Uint8Array(data)));
}

export async function decryptRefreshToken(value: string, userId: string, base64Key: string): Promise<string> {
  const bytes = Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12), additionalData: new TextEncoder().encode(userId) }, await cryptKey(base64Key), bytes.slice(12));
  return new TextDecoder().decode(plain);
}
