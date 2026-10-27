// 교실 사운드스케이프: Web Audio API로 모든 소리를 실시간 합성
// 구조: [각 소리 소스] → 채널 GainNode(개별 볼륨) → master GainNode(전체 볼륨) → 출력
import { load, save } from '../lib/storage';

export type SoundId = 'clock' | 'pencil' | 'breeze' | 'hum';

export interface SoundMeta {
  id: SoundId;
  label: string;
  hint: string;
  trim: number; // 소리별 기본 음량 보정
}

export const SOUNDS: SoundMeta[] = [
  { id: 'clock', label: 'Wall clock', hint: 'tick, tock', trim: 0.55 },
  { id: 'pencil', label: 'Pencil', hint: 'scratch on paper', trim: 0.5 },
  { id: 'breeze', label: 'Open window', hint: 'breeze & birds', trim: 0.7 },
  { id: 'hum', label: 'Room tone', hint: 'hallway & air', trim: 0.6 },
];

export interface ChannelSetting {
  on: boolean;
  vol: number; // 0~1
}

export interface AudioSettings {
  master: number;
  sounds: Record<SoundId, ChannelSetting>;
}

// 소리는 사람마다 반대로 작용할 수 있어(근거 지도 자료 4) 기본은 모두 꺼 두고 사용자가 고른다
const DEFAULTS: AudioSettings = {
  master: 0.8,
  sounds: {
    clock: { on: false, vol: 0.5 },
    pencil: { on: false, vol: 0.55 },
    breeze: { on: false, vol: 0.6 },
    hum: { on: false, vol: 0.4 },
  },
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);

type Listener = (s: AudioSettings) => void;

class Soundscape {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private channels = {} as Record<SoundId, GainNode>;
  private white: AudioBuffer | null = null;
  private timer: number | null = null;
  private loops: AudioScheduledSourceNode[] = [];
  private nextTick = 0;
  private tickCount = 0;
  private nextPencil = 0;
  private nextBird = 0;
  private listeners = new Set<Listener>();
  playing = false;

  settings: AudioSettings = (() => {
    const s = load<AudioSettings>('audio', DEFAULTS);
    // 저장값 일부가 빠져 있어도 기본값으로 보완
    return { master: s.master, sounds: { ...DEFAULTS.sounds, ...s.sounds } };
  })();

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  }

  private emit() {
    save('audio', this.settings);
    this.listeners.forEach((fn) => fn(this.settings));
  }

  // 반드시 사용자 제스처(탭) 안에서 호출해야 오디오가 열린다
  async start() {
    if (!this.ctx) this.build();
    const ctx = this.ctx!;
    if (ctx.state !== 'running') await ctx.resume();
    if (!this.playing) {
      this.playing = true;
      this.fade(this.master!.gain, this.settings.master, 0.8);
      const t = ctx.currentTime + 0.1;
      this.nextTick = Math.ceil(t);
      this.nextPencil = t + rand(0.5, 2);
      this.nextBird = t + rand(1.5, 4);
      this.timer = window.setInterval(() => this.schedule(), 40);
    }
  }

  stop() {
    if (!this.ctx || !this.playing) return;
    this.playing = false;
    this.fade(this.master!.gain, 0, 0.5);
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
  }

  setMaster(v: number) {
    this.settings = { ...this.settings, master: v };
    if (this.master && this.playing) this.fade(this.master.gain, v, 0.08);
    this.emit();
  }

  setSound(id: SoundId, patch: Partial<ChannelSetting>) {
    const next = { ...this.settings.sounds[id], ...patch };
    this.settings = { ...this.settings, sounds: { ...this.settings.sounds, [id]: next } };
    this.applyChannel(id, 0.15);
    this.emit();
  }

  // 세션 완료 알림음(부드러운 3화음 아르페지오)
  chime() {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    [659.25, 880, 1318.5].forEach((f, i) => {
      const t = ctx.currentTime + i * 0.18;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 1.7);
    });
  }

  // ───────── 내부: 그래프 구성 ─────────

  private build() {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);

    for (const s of SOUNDS) {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(this.master);
      this.channels[s.id] = g;
      this.applyChannel(s.id, 0.01);
    }

    this.white = this.makeNoise('white', 2);
    this.buildBreeze();
    this.buildHum();
  }

  private applyChannel(id: SoundId, time: number) {
    const g = this.channels[id];
    if (!g) return;
    const s = this.settings.sounds[id];
    const trim = SOUNDS.find((x) => x.id === id)!.trim;
    this.fade(g.gain, s.on ? s.vol * trim : 0, time);
  }

  private fade(param: AudioParam, value: number, time: number) {
    const ctx = this.ctx!;
    param.cancelScheduledValues(ctx.currentTime);
    param.setValueAtTime(param.value, ctx.currentTime);
    param.linearRampToValueAtTime(value, ctx.currentTime + time);
  }

  private makeNoise(kind: 'white' | 'pink' | 'brown', seconds: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'white') d[i] = w;
      else if (kind === 'brown') {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      } else {
        // 간이 핑크 노이즈 필터
        b0 = 0.99765 * b0 + w * 0.099046;
        b1 = 0.963 * b1 + w * 0.2965164;
        b2 = 0.57 * b2 + w * 1.0526913;
        d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
      }
    }
    return buf;
  }

  private loopSource(buf: AudioBuffer) {
    const src = this.ctx!.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.start();
    this.loops.push(src);
    return src;
  }

  // 창밖 바람: 핑크 노이즈 + 느린 LFO로 세기가 오르내림
  private buildBreeze() {
    const ctx = this.ctx!;
    const src = this.loopSource(this.makeNoise('pink', 4));
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 850;
    const swell = ctx.createGain();
    swell.gain.value = 0.55;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.35;
    lfo.connect(lfoDepth).connect(swell.gain);
    lfo.start();
    this.loops.push(lfo);
    src.connect(lp).connect(swell).connect(this.channels.breeze);
  }

  // 교실 룸톤: 낮은 브라운 노이즈(공조) + 아주 작은 형광등 험
  private buildHum() {
    const ctx = this.ctx!;
    const src = this.loopSource(this.makeNoise('brown', 4));
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 320;
    src.connect(lp).connect(this.channels.hum);
    for (const [f, v] of [[120, 0.035], [240, 0.012]] as const) {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = v;
      o.connect(g).connect(this.channels.hum);
      o.start();
      this.loops.push(o);
    }
  }

  // ───────── 내부: 이벤트형 소리 스케줄러 ─────────

  private schedule() {
    const ctx = this.ctx!;
    const horizon = ctx.currentTime + 0.2;
    const on = this.settings.sounds;

    while (this.nextTick < horizon) {
      if (on.clock.on) this.tick(this.nextTick, this.tickCount % 2 === 0);
      this.tickCount++;
      this.nextTick += 1;
    }
    while (this.nextPencil < horizon) {
      this.nextPencil = on.pencil.on ? this.pencilGroup(this.nextPencil) + rand(1.2, 4.5) : this.nextPencil + 1;
    }
    while (this.nextBird < horizon) {
      if (on.breeze.on) this.birdCall(this.nextBird);
      this.nextBird += rand(3.5, 10);
    }
  }

  private burst(t: number, dur: number, out: AudioNode, filters: BiquadFilterNode[]) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.white;
    const g = ctx.createGain();
    let node: AudioNode = src;
    for (const f of filters) node = node.connect(f);
    node.connect(g).connect(out);
    src.start(t, rand(0, 1.5), dur + 0.05);
    return g;
  }

  private filter(type: BiquadFilterType, freq: number, q = 1) {
    const f = this.ctx!.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    return f;
  }

  // 시계 초침: 짧은 딸깍 + 나무 울림, 틱/톡 음높이 교대
  private tick(t: number, isTick: boolean) {
    const ctx = this.ctx!;
    const g = this.burst(t, 0.06, this.channels.clock, [this.filter('bandpass', isTick ? 3400 : 2700, 5)]);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(1.6, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
    const o = ctx.createOscillator();
    const og = ctx.createGain();
    o.frequency.value = isTick ? 1850 : 1600;
    og.gain.setValueAtTime(0.12, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    o.connect(og).connect(this.channels.clock);
    o.start(t);
    o.stop(t + 0.04);
  }

  // 연필 필기: 불규칙한 사각거림 여러 획을 한 묶음으로, 묶음 끝 시각 반환
  private pencilGroup(t: number) {
    let at = t;
    const strokes = Math.floor(rand(2, 7));
    for (let i = 0; i < strokes; i++) {
      const dur = rand(0.08, 0.38);
      const g = this.burst(at, dur, this.channels.pencil, [
        this.filter('highpass', 1800, 0.7),
        this.filter('bandpass', rand(3600, 5200), 0.9),
      ]);
      g.gain.setValueAtTime(0, at);
      // 획 안에서 진폭을 잘게 흔들어 종이 긁히는 질감
      for (let s = 0; s < dur; s += 0.025) g.gain.linearRampToValueAtTime(rand(0.25, 1), at + s);
      g.gain.linearRampToValueAtTime(0, at + dur);
      at += dur + rand(0.04, 0.22);
    }
    return at;
  }

  // 새소리: 짧게 위로 휘는 사인 음 2~5개
  private birdCall(t: number) {
    const ctx = this.ctx!;
    const notes = Math.floor(rand(2, 6));
    const base = rand(2600, 3600);
    let at = t;
    for (let i = 0; i < notes; i++) {
      const dur = rand(0.05, 0.12);
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(base * rand(0.9, 1.05), at);
      o.frequency.exponentialRampToValueAtTime(base * rand(1.2, 1.5), at + dur);
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.05, at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(g).connect(this.channels.breeze);
      o.start(at);
      o.stop(at + dur + 0.02);
      at += dur + rand(0.03, 0.12);
    }
  }
}

// 앱 전체에서 하나의 오디오 엔진만 사용
export const soundscape = new Soundscape();
