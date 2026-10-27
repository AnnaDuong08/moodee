// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { RoomAudio } from './roomAudio';

// Audio hardware is unavailable in jsdom. Keep loading, routing, fades and
// preferences real; replace only the browser's audio nodes and network boundary.
let contexts: FakeContext[] = [];
class FakeParam {
  value = 0;
  cancelScheduledValues() {}
  setValueAtTime(value: number) { this.value = value; }
  linearRampToValueAtTime(value: number) { this.value = value; }
}
class FakeGain {
  gain = new FakeParam();
  connect() { return this; }
  disconnect() {}
}
class FakeSource {
  buffer: unknown;
  loop = false;
  started = false;
  stopped = false;
  onended: (() => void) | null = null;
  connect() { return this; }
  disconnect() {}
  start() { this.started = true; }
  stop() { this.stopped = true; this.onended?.(); }
}
class FakeContext {
  state = 'suspended';
  currentTime = 0;
  destination = {};
  sources: FakeSource[] = [];
  constructor() { contexts.push(this); }
  createGain() { return new FakeGain(); }
  createBufferSource() { const source = new FakeSource(); this.sources.push(source); return source; }
  async decodeAudioData(data: ArrayBuffer) { return { id: new TextDecoder().decode(data) }; }
  async resume() { this.state = 'running'; }
  async suspend() { this.state = 'suspended'; }
  async close() { this.state = 'closed'; }
}
let player: RoomAudio;
beforeEach(() => {
  localStorage.clear(); contexts = [];
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubEnv('BASE_URL', './');
  vi.stubGlobal('AudioContext', FakeContext);
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, arrayBuffer: async () => new TextEncoder().encode(url).buffer })));
  player = new RoomAudio();
});
afterEach(() => { player.dispose(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });
const settle = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };

it('waits for a gesture, plays Home, and stops background audio in Classroom and Calendar', async () => {
  player.move('home');
  expect(fetch).not.toHaveBeenCalled();
  await player.unlock(); await settle();
  expect(player.snapshot.status).toBe('playing');
  const source = contexts[0].sources[0];
  expect(source.loop).toBe(true);
  expect(source.buffer).toEqual({id: './assets/audio/home.mp3?v=1'});
  player.move('classroom');
  expect(source.stopped).toBe(true);
  expect(player.snapshot.place).toBe(null);
  player.move('calendar'); await settle();
  expect(contexts[0].sources.filter(s => s.started)).toHaveLength(1);
});

it('does not play stale tracks when the user changes rooms before loading finishes', async () => {
  const pending = new Map<string, (value: unknown) => void>();
  vi.stubGlobal('fetch', vi.fn((url: string) => new Promise(resolve => pending.set(url, resolve))));
  player.move('home'); await player.unlock();
  player.move('cafe'); player.move('library');
  for (const [url, resolve] of pending) resolve({ok:true, arrayBuffer:async()=>new TextEncoder().encode(url).buffer});
  await settle();
  expect(contexts[0].sources.filter(s => s.started).map(s => s.buffer)).toEqual([{id:'./assets/audio/library.mp3?v=1'}]);
});

it('saves mute and volume, and does not start another room while muted', async () => {
  player.move('home'); await player.unlock(); await settle();
  player.setVolume(.2); player.setMuted(true); player.move('cafe'); await settle();
  expect(contexts[0].sources.every(s => s.stopped)).toBe(true);
  expect(fetch).toHaveBeenCalledTimes(1);
  const restored = new RoomAudio();
  expect(restored.snapshot.muted).toBe(true);
  expect(restored.snapshot.volume).toBe(.2);
  restored.dispose();
  player.setMuted(false); await settle();
  expect(player.snapshot.place).toBe('cafe');
  expect(player.snapshot.status).toBe('playing');
});

it('stops immediately in the background and resumes the selected room on return', async () => {
  player.move('my-room'); await player.unlock(); await settle();
  player.setHidden(true); await settle();
  expect(contexts[0].state).toBe('suspended');
  expect(contexts[0].sources[0].stopped).toBe(true);
  expect(player.snapshot.status).toBe('paused');
  player.setHidden(false); await settle();
  expect(contexts[0].state).toBe('running');
  expect(player.snapshot.status).toBe('playing');
});

it('resumes after a pending suspension when backgrounding ends quickly', async () => {
  player.move('home'); await player.unlock(); await settle();
  const ctx = contexts[0];
  let finishSuspend!: () => void;
  vi.spyOn(ctx, 'suspend').mockImplementation(() => new Promise<void>(resolve => {
    finishSuspend = () => { ctx.state = 'suspended'; resolve(); };
  }));
  player.setHidden(true);
  player.setHidden(false);
  finishSuspend(); await settle();
  expect(ctx.state).toBe('running');
  expect(player.snapshot.status).toBe('playing');
});

it('keeps failed downloads silent and retries only after another gesture', async () => {
  vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'));
  player.move('museum'); await player.unlock(); await settle();
  expect(player.snapshot.status).toBe('error');
  expect(contexts[0].sources).toHaveLength(0);
  await player.unlock(); await settle();
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(player.snapshot.status).toBe('playing');
});

it('ignores invalid saved volume and survives unavailable audio hardware', async () => {
  localStorage.setItem('moodie:roomAudio', JSON.stringify({muted:'false', volume:999}));
  const invalid = new RoomAudio();
  expect(invalid.snapshot.muted).toBe(false);
  expect(invalid.snapshot.volume).toBe(.35);
  invalid.dispose();
  vi.stubGlobal('AudioContext', undefined);
  player.move('home'); await player.unlock();
  expect(player.snapshot.status).toBe('error');
});

it('rejects an empty successful response and allows a later retry', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(new Response(null, {status:204}));
  player.move('home'); await player.unlock(); await settle();
  expect(player.snapshot.status).toBe('error');
  expect(contexts[0].sources).toHaveLength(0);
  await player.unlock(); await settle();
  expect(player.snapshot.status).toBe('playing');
});
