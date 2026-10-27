import { loadValue, save } from '../lib/storage';

export const ROOM_TRACKS = {
  home: { label: 'Home music', trim: .8 },
  cafe: { label: 'Café ambience', trim: .65 },
  library: { label: 'Library ambience', trim: .45 },
  museum: { label: 'Museum ambience', trim: .45 },
  'my-room': { label: 'My Room ambience', trim: .5 },
} as const;
type AudioPlace = keyof typeof ROOM_TRACKS;
type Status = 'locked' | 'loading' | 'playing' | 'off' | 'paused' | 'error';
interface Snapshot { muted: boolean; volume: number; status: Status; place: AudioPlace | null }
interface Voice { source: AudioBufferSourceNode; gain: GainNode }

// One owner in App routes the audio, so screens retained during animations or
// Pomodoro breaks cannot accidentally keep their old track playing.
export class RoomAudio {
  private ctx: AudioContext | null = null;
  private unlocked = false;
  private hidden = false;
  private suspension: Promise<void> | null = null;
  private revision = 0;
  private voices = new Set<Voice>();
  private current: Voice | null = null;
  private buffers = new Map<AudioPlace, Promise<AudioBuffer>>();
  private downloads = new Set<AbortController>();
  private listeners = new Set<() => void>();
  snapshot: Snapshot;

  constructor() {
    const stored = loadValue<Partial<Snapshot> | null>('roomAudio', null);
    const volume = stored?.volume;
    this.snapshot = {
      muted: stored?.muted === true,
      volume: typeof volume === 'number' && Number.isFinite(volume) && volume >= 0 && volume <= 1 ? volume : .35,
      place: null, status: 'locked',
    };
  }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getSnapshot = () => this.snapshot;
  private update(patch: Partial<Snapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach(listener => listener());
  }
  private persist() { save('roomAudio', { muted: this.snapshot.muted, volume: this.snapshot.volume }); }

  move(screen: string) {
    const place = Object.prototype.hasOwnProperty.call(ROOM_TRACKS, screen) ? screen as AudioPlace : null;
    if (place === this.snapshot.place) return;
    this.update({ place });
    void this.play();
  }

  // Called synchronously by a pointer/key gesture, including Tap to start. This
  // unlocks Safari's context before loading tracks or changing screens.
  async unlock() {
    if (this.hidden || this.snapshot.muted || this.snapshot.volume === 0) return;
    let ctx: AudioContext | null = null;
    try {
      if (!this.ctx) {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) throw new Error('Web Audio unavailable');
        this.ctx = new Ctx();
      }
      ctx = this.ctx;
      // suspend() changes state asynchronously. On a quick app switch, wait
      // for it before resuming rather than trusting a still-running state.
      if (this.suspension) await this.suspension;
      if (ctx !== this.ctx || this.hidden) return;
      if (ctx.state !== 'running') await ctx.resume();
      if (ctx !== this.ctx || this.hidden || ctx.state !== 'running') return;
      this.unlocked = true;
      if (!['playing', 'loading'].includes(this.snapshot.status)) void this.play();
    } catch (error) {
      if (ctx && ctx !== this.ctx) return;
      if (import.meta.env.DEV) console.warn('Room audio could not start', error);
      this.update({ status: 'error' });
    }
  }

  setMuted(muted: boolean) {
    this.update({ muted }); this.persist();
    void this.play();
  }
  setVolume(value: number) {
    if (!Number.isFinite(value)) return;
    const volume = Math.max(0, Math.min(1, value));
    const wasSilent = this.snapshot.volume === 0;
    this.update({ volume }); this.persist();
    if (volume === 0 || wasSilent) void this.play();
    else if (this.current && this.snapshot.place) this.fade(this.current.gain.gain, volume * ROOM_TRACKS[this.snapshot.place].trim, .08);
  }
  setHidden(hidden: boolean) {
    if (hidden === this.hidden) return;
    this.hidden = hidden;
    if (hidden) {
      this.revision++;
      this.stopVoices(0);
      this.update({ status: 'paused' });
      if (this.ctx) {
        const pending = this.ctx.suspend().catch(() => {});
        this.suspension = pending;
        void pending.finally(() => { if (this.suspension === pending) this.suspension = null; });
      }
    } else if (this.unlocked) {
      void this.unlock();
    }
  }

  private fade(param: AudioParam, value: number, seconds: number) {
    const at = this.ctx!.currentTime;
    param.cancelScheduledValues(at);
    param.setValueAtTime(param.value, at);
    param.linearRampToValueAtTime(value, at + seconds);
  }
  private stopVoices(seconds: number) {
    this.current = null;
    for (const voice of this.voices) {
      this.fade(voice.gain.gain, 0, seconds);
      try { voice.source.stop(this.ctx!.currentTime + seconds); } catch { /* Already ended. */ }
    }
  }
  private load(place: AudioPlace, ctx: AudioContext) {
    const cached = this.buffers.get(place);
    if (cached) return cached;
    const controller = new AbortController();
    this.downloads.add(controller);
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    const pending = fetch(`${import.meta.env.BASE_URL}assets/audio/${place === 'my-room' ? 'room' : place}.mp3?v=1`, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Audio unavailable');
        return response.arrayBuffer();
      })
      .then(bytes => {
        if (bytes.byteLength === 0) throw new Error('Audio file is empty');
        return ctx.decodeAudioData(bytes);
      })
      .catch(error => { if (this.buffers.get(place) === pending) this.buffers.delete(place); throw error; })
      .finally(() => { clearTimeout(timeout); this.downloads.delete(controller); });
    this.buffers.set(place, pending);
    return pending;
  }
  private async play() {
    const revision = ++this.revision;
    this.stopVoices(this.snapshot.place ? .4 : 0);
    const { place, muted, volume } = this.snapshot;
    if (!place || muted || volume === 0) { this.update({ status: 'off' }); return; }
    if (this.hidden) { this.update({ status: 'paused' }); return; }
    if (!this.ctx || !this.unlocked || this.ctx.state !== 'running') { this.update({ status: 'locked' }); return; }
    const ctx = this.ctx;
    this.update({ status: 'loading' });
    try {
      const buffer = await this.load(place, ctx);
      if (revision !== this.revision || this.hidden || ctx !== this.ctx) return;
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = 0;
      source.buffer = buffer; source.loop = true;
      source.connect(gain).connect(ctx.destination);
      const voice = { source, gain };
      source.onended = () => { source.disconnect(); gain.disconnect(); this.voices.delete(voice); };
      this.voices.add(voice); this.current = voice;
      source.start();
      this.fade(gain.gain, this.snapshot.volume * ROOM_TRACKS[place].trim, .6);
      this.update({ status: 'playing' });
    } catch (error) {
      if (revision === this.revision) {
        if (import.meta.env.DEV) console.warn('Room audio could not load', error);
        this.update({ status: 'error' });
      }
    }
  }
  dispose() {
    this.revision++;
    this.stopVoices(0);
    this.voices.clear();
    this.downloads.forEach(controller => controller.abort());
    this.buffers.clear();
    void this.ctx?.close().catch(() => {});
    this.ctx = null; this.unlocked = false;
    this.suspension = null;
    this.update({ status: 'locked' });
  }
}
export const roomAudio = new RoomAudio();
