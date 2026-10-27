// 공통 월드(탑뷰) 장면: 배경 이미지 위에서 내 Cloudee가 걸어 다니고, 인터랙션 지점에 가까이 가면 행동 버튼이 뜬다
// 이동: 조이스틱 · WASD/방향키 · 바닥 탭(길찾기). NPC는 웨이포인트 사이를 천천히 오가며, 플레이어·NPC끼리 겹치지 않는다
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { CharacterSprite } from '../components/CharacterSprite';
import { Joystick } from '../components/Joystick';
import type { Character, Pose } from '../data/characters';
import type { Rect } from '../data/places';
import { camera, useElementSize } from '../lib/useElementSize';
import { makeWalker, type Pt } from '../lib/walkGrid';
import { WorldChat, type Chatter } from './WorldChat';
import styles from './WorldScene.module.css';

export interface WorldConfig {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  bounds: Rect;
  blockers: Rect[];
  start: Pt; // 입구
  charH: number; // 캐릭터 컷 높이(이미지 높이 대비)
  zoom: number;
  waypoints: Pt[]; // NPC가 오가는 지점
  exit?: Pt; // 문: 여기까지 걸어가면 공간을 나간다
}

export interface Zone {
  id: string;
  x: number;
  y: number;
  label: string; // 예: "Sit here"
  kind?: string;
  radius?: number;
}

export interface WorldNpc {
  id: string;
  name?: string;
  tag?: string;
  character: Character;
  at?: Pt; // 고정 위치(앉아 있는 NPC). 없으면 웨이포인트를 돌아다닌다
  pose?: Pose;
  scale?: number;
}

interface Props {
  config: WorldConfig;
  character: Character;
  zones: Zone[];
  npcs: WorldNpc[];
  onAct: (zone: Zone) => void;
  hint: { title: string; text: string };
  paused?: boolean; // 활동 화면이 열려 있는 동안 입력을 받지 않음
  carrying?: ReactNode; // 들고 있는 것(음료 등)
  children?: ReactNode; // 장면 위 레이어(전시물 등)
  onExit?: () => void; // 문으로 걸어 나갔을 때
  exitLabel?: string;
  chatter?: Chatter; // 다른 Cloudee들의 대화
}

const SPEED = 140; // 플레이어 이미지 px/초(천천히 걷는 느낌)
const NPC_SPEED = 72;
const NEAR = 56;
const PLAYER_R = 30; // 발 위치 기준 충돌 반경
const NPC_R = 28;

type Dir = 'up' | 'down' | 'left' | 'right';
const POSE_OF: Record<Dir, Pose> = { up: 'back', down: 'front', left: 'side', right: 'sideAlt' };
const dirOf = (vx: number, vy: number): Dir => (Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : vy > 0 ? 'down' : 'up');

interface NpcState {
  pos: Pt;
  route: Pt[];
  wait: number; // 남은 대기 시간(초)
  blocked: number; // 길이 막힌 시간
  dir: Dir;
  moving: boolean;
  fixed: boolean;
}

// 공간을 나갔다 들어와도 마지막 위치를 기억
const lastPos = new Map<string, Pt>();

const EXIT_R = 34;

export function WorldScene({ config, character, zones, npcs, onAct, hint, paused, carrying, children, onExit, exitLabel = 'Exit', chatter }: Props) {
  const { width: W, height: H } = config;
  const viewport = useRef<HTMLDivElement>(null);
  const { w: vw, h: vh } = useElementSize(viewport);
  const walker = useMemo(() => makeWalker(config.bounds, config.blockers), [config]);

  const [pos, setPos] = useState<Pt>(() => lastPos.get(config.id) ?? config.start);
  const [dir, setDir] = useState<Dir>('up');
  const [moving, setMoving] = useState(false);
  const [target, setTarget] = useState<Pt | null>(null);
  const [, setTick] = useState(0);
  // 나가는 중: 문 밖으로 걸어 나가며 화면이 어두워진다
  const [leaving, setLeaving] = useState(false);
  const leavingRef = useRef(false);
  const armed = useRef(false); // 입구에서 시작하므로, 문에서 한 번 멀어진 뒤에만 나가기가 켜진다
  const exitRef = useRef(onExit);
  exitRef.current = onExit;
  // NPC 머리 위 말풍선
  const [said, setSaid] = useState<Record<string, { text: string; until: number }>>({});
  const say = (id: string, text: string) => setSaid((m) => ({ ...m, [id]: { text, until: Date.now() + 4200 } }));

  const posRef = useRef(pos);
  const stick = useRef({ x: 0, y: 0 });
  const keys = useRef(new Set<string>());
  const route = useRef<Pt[]>([]);
  const pausedRef = useRef(!!paused);
  pausedRef.current = !!paused;

  // NPC 상태: 고정(앉음) 또는 배회. 배회하는 NPC는 서로 다른 웨이포인트에서 시작
  const npcState = useRef(new Map<string, NpcState>());
  useMemo(() => {
    const free = config.waypoints.filter((w) => Math.hypot(w.x - posRef.current.x, w.y - posRef.current.y) > 120);
    let k = Math.floor(Math.random() * free.length);
    for (const n of npcs) {
      if (npcState.current.has(n.id)) continue;
      const at = n.at ?? free[k++ % free.length] ?? config.waypoints[0];
      npcState.current.set(n.id, { pos: { ...at }, route: [], wait: 1 + Math.random() * 4, blocked: 0, dir: 'down', moving: false, fixed: !!n.at });
    }
  }, [npcs, config]);

  const near = useMemo(() => {
    let best: Zone | null = null;
    let bd = Infinity;
    for (const z of zones) {
      const d = Math.hypot(z.x - pos.x, z.y - pos.y);
      if (d < (z.radius ?? NEAR) && d < bd) {
        bd = d;
        best = z;
      }
    }
    return best;
  }, [pos, zones]);
  const nearRef = useRef(near);
  nearRef.current = near;
  const actRef = useRef(onAct);
  actRef.current = onAct;

  // 방향키/WASD 이동, E(또는 Enter)로 행동. 글을 쓰는 중에는 가로채지 않는다
  useEffect(() => {
    const map: Record<string, string> = { ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd', ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r' };
    const typing = (e: KeyboardEvent) => e.target instanceof HTMLElement && /INPUT|TEXTAREA/.test(e.target.tagName);
    const down = (e: KeyboardEvent) => {
      if (pausedRef.current || typing(e)) return;
      if (map[e.code]) {
        keys.current.add(map[e.code]);
        e.preventDefault();
      } else if (e.code === 'KeyE' && nearRef.current) actRef.current(nearRef.current);
    };
    const up = (e: KeyboardEvent) => map[e.code] && keys.current.delete(map[e.code]);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // 게임 루프: 플레이어 → NPC 순서로 한 프레임씩
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const others = (skip?: string) => [...npcState.current].filter(([id]) => id !== skip).map(([, s]) => s.pos);
    // 발 위치 기준: 다른 캐릭터 쪽으로 더 가까워지는 이동만 막는다(이미 붙어 있어도 빠져나올 수 있게)
    const hits = (from: Pt, to: Pt, list: Pt[], r: number) => list.some((o) => Math.hypot(to.x - o.x, to.y - o.y) < r && Math.hypot(to.x - o.x, to.y - o.y) < Math.hypot(from.x - o.x, from.y - o.y));

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      raf = requestAnimationFrame(loop);
      if (pausedRef.current) {
        keys.current.clear();
        return;
      }
      if (leavingRef.current) {
        // 문 밖(아래쪽)으로 계속 걸어 나간다
        const p = { x: posRef.current.x, y: posRef.current.y + SPEED * 0.6 * dt };
        posRef.current = p;
        setPos(p);
        setDir('down');
        setMoving(true);
        return;
      }

      // ── 플레이어 ──
      const k = keys.current;
      let vx = stick.current.x + (k.has('r') ? 1 : 0) - (k.has('l') ? 1 : 0);
      let vy = stick.current.y + (k.has('d') ? 1 : 0) - (k.has('u') ? 1 : 0);
      const mag = Math.hypot(vx, vy);
      if (mag > 0.2) {
        if (route.current.length) {
          route.current = [];
          setTarget(null);
        }
        const m = Math.min(1, mag);
        vx = (vx / mag) * m;
        vy = (vy / mag) * m;
      } else if (route.current.length) {
        const wp = route.current[0];
        const dx = wp.x - posRef.current.x, dy = wp.y - posRef.current.y;
        const d = Math.hypot(dx, dy);
        if (d < 4) {
          route.current.shift();
          if (!route.current.length) setTarget(null);
          vx = vy = 0;
        } else {
          vx = dx / d;
          vy = dy / d;
        }
      } else vx = vy = 0;

      let isMoving = vx !== 0 || vy !== 0;
      if (isMoving) {
        const cur = posRef.current;
        const npcPts = others();
        const R = PLAYER_R + NPC_R;
        let p = route.current.length ? { x: cur.x + vx * SPEED * dt, y: cur.y + vy * SPEED * dt } : walker.step(cur, vx * SPEED * dt, vy * SPEED * dt);
        if (hits(cur, p, npcPts, R)) {
          // NPC에 막히면 한 축씩만 움직여 옆으로 비켜 가 본다
          const px = walker.step(cur, vx * SPEED * dt, 0);
          const py = walker.step(cur, 0, vy * SPEED * dt);
          if (!hits(cur, px, npcPts, R) && px.x !== cur.x) p = px;
          else if (!hits(cur, py, npcPts, R) && py.y !== cur.y) p = py;
          else {
            p = cur;
            if (route.current.length) {
              route.current = [];
              setTarget(null);
            }
          }
        }
        isMoving = p !== cur;
        posRef.current = p;
        lastPos.set(config.id, p);
        if (config.exit && exitRef.current) {
          const d = Math.hypot(p.x - config.exit.x, p.y - config.exit.y);
          if (d > EXIT_R + 40) armed.current = true;
          else if (d < EXIT_R && armed.current) {
            leavingRef.current = true;
            setLeaving(true);
            route.current = [];
            setTarget(null);
            lastPos.delete(config.id); // 다음에는 다시 입구에서 시작
            window.setTimeout(() => exitRef.current?.(), 1100);
          }
        }
        setPos(p);
        setDir(dirOf(vx, vy));
      }
      setMoving(isMoving);

      // ── NPC: 잠깐 머물다 → 웨이포인트 고르기 → 걷기 → 도착 ──
      let changed = false;
      for (const [id, s] of npcState.current) {
        if (s.fixed) continue;
        if (s.wait > 0) {
          s.wait -= dt;
          continue;
        }
        if (!s.route.length) {
          const wp = config.waypoints[Math.floor(Math.random() * config.waypoints.length)];
          s.route = Math.hypot(wp.x - s.pos.x, wp.y - s.pos.y) > 60 ? walker.path(s.pos, wp) : [];
          if (!s.route.length) s.wait = 1.5;
          continue;
        }
        const wp = s.route[0];
        const dx = wp.x - s.pos.x, dy = wp.y - s.pos.y;
        const d = Math.hypot(dx, dy);
        if (d < 3) {
          s.route.shift();
          if (!s.route.length) {
            s.wait = 3 + Math.random() * 5;
            s.moving = false;
            changed = true;
          }
          continue;
        }
        const next = { x: s.pos.x + (dx / d) * NPC_SPEED * dt, y: s.pos.y + (dy / d) * NPC_SPEED * dt };
        const crowd = [posRef.current, ...others(id)];
        if (hits(s.pos, next, crowd, PLAYER_R + NPC_R + 34)) {
          // 누가 길을 막고 있으면 멈춰 기다리다, 오래 막히면 다른 곳으로
          if (s.moving) changed = true;
          s.moving = false;
          s.blocked += dt;
          if (s.blocked > 1.4) {
            s.route = [];
            s.blocked = 0;
            s.wait = 0.6;
          }
          continue;
        }
        s.blocked = 0;
        s.pos = next;
        s.dir = dirOf(dx, dy);
        s.moving = true;
        changed = true;
      }
      if (changed) setTick((t) => (t + 1) % 1e6);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [walker, config]);

  const cam = camera(vw || 1, vh || 1, W, H, config.zoom, pos.x, pos.y, (vw || 1) / 2, (vh || 1) * 0.47);

  const walkTo = (p: Pt) => {
    const r = walker.path(posRef.current, p);
    route.current = r;
    setTarget(r.length ? r[r.length - 1] : null);
  };
  const onTap = (e: ReactPointerEvent) => {
    const rect = viewport.current!.getBoundingClientRect();
    walkTo({ x: (e.clientX - rect.left - cam.x) / cam.s, y: (e.clientY - rect.top - cam.y) / cam.s });
  };

  const cell = config.charH * H;

  return (
    <div className={styles.wrap}>
      <div ref={viewport} className={styles.viewport} onPointerDown={onTap}>
        <div className={styles.stage} style={{ width: W, height: H, transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.s})` }}>
          <img className={styles.bg} src={config.src} alt={config.alt} draggable={false} />

          {zones.map((z) => (
            <button
              key={z.id}
              type="button"
              className={`${styles.zone} ${near?.id === z.id ? styles.zoneNear : ''}`}
              style={{ left: z.x, top: z.y }}
              aria-label={`Walk to: ${z.label}`}
              onPointerDown={(e) => {
                e.stopPropagation();
                walkTo({ x: z.x, y: z.y });
              }}
            >
              <span className={styles.ring} />
            </button>
          ))}

          {config.exit && onExit && (
            <button
              type="button"
              className={styles.exit}
              style={{ left: config.exit.x, top: config.exit.y }}
              aria-label={`Walk to the door: ${exitLabel}`}
              onPointerDown={(e) => {
                e.stopPropagation();
                armed.current = true;
                walkTo(config.exit!);
              }}
            >
              <span>↓ {exitLabel}</span>
            </button>
          )}

          {children}

          {npcs.map((n) => {
            const s = npcState.current.get(n.id);
            if (!s) return null;
            return (
              <div key={n.id} className={styles.char} style={{ left: s.pos.x, top: s.pos.y, height: cell * (n.scale ?? 0.94), zIndex: Math.round(s.pos.y) }}>
                <span className={styles.shadow} />
                <div className={s.moving ? styles.walking : styles.idle}>
                  <CharacterSprite character={n.character} pose={s.fixed ? (n.pose ?? 'back') : POSE_OF[s.dir]} />
                </div>
                {said[n.id] && said[n.id].until > Date.now() && <span className={styles.bubble}>{said[n.id].text}</span>}
                {n.name && (
                  <span className={styles.tag}>
                    <b>{n.name}</b> {n.tag}
                  </span>
                )}
              </div>
            );
          })}

          {target && <span className={styles.target} style={{ left: target.x, top: target.y }} />}

          <div className={styles.char} style={{ left: pos.x, top: pos.y, height: cell, zIndex: Math.round(pos.y) }}>
            <span className={styles.shadow} />
            <div className={moving ? styles.walking : styles.idle}>
              <CharacterSprite character={character} pose={POSE_OF[dir]} />
            </div>
            {carrying && <span className={styles.carry}>{carrying}</span>}
          </div>
        </div>
      </div>

      {chatter && <WorldChat chatter={chatter} paused={paused || leaving} onSay={say} />}
      <AnimatePresence>
        {leaving && (
          <motion.div className={styles.leaving} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9 }}>
            <span>Heading out…</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={styles.controls}>
        <Joystick onChange={(v) => (stick.current = v)} />
        <div className={styles.side}>
          <AnimatePresence initial={false} mode="popLayout">
            {near ? (
              <motion.button key={near.id} type="button" className={styles.cta} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => onAct(near)}>
                <kbd>E</kbd> {near.label}
              </motion.button>
            ) : (
              <motion.p key="hint" className={styles.hint} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <b>{hint.title}</b>
                {hint.text}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
