// 교실 탑뷰 미니게임: 조이스틱·방향키·바닥 탭으로 걸어가 빈자리를 고른다
import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react';
import type { Character, Pose } from '../data/characters';
import { CLASSMATES, classmateLooks } from '../data/classmates';
import { CLASSROOM, type Seat } from '../data/places';
import { camera, useElementSize } from '../lib/useElementSize';
import { makeWalker, type Pt } from '../lib/walkGrid';
import { CharacterSprite } from './CharacterSprite';
import { Joystick } from './Joystick';
import { SunLight } from './SunLight';
import styles from './SeatPicker.module.css';

interface Props {
  character: Character;
  onSit: (seat: Seat) => void;
  onPeople: () => void; // 앉아 있는 친구를 누르면 "같은 방 사람들" 열기
  movementAction?: ReactNode;
}

const { width: W, height: H, top } = CLASSROOM;
const SPEED = 140; // 이미지 px/초
const NEAR = 38; // 이 거리 안이면 앉을 수 있음
const ZOOM = 1.25; // 창문(햇살이 들어오는 곳)이 화면 왼쪽에 걸리도록

type Dir = 'up' | 'down' | 'left' | 'right';
const POSE_OF: Record<Dir, Pose> = { up: 'back', down: 'front', left: 'side', right: 'sideAlt' };

export function SeatPicker({ character, onSit, onPeople, movementAction }: Props) {
  // 이미 친구가 앉아 있는 자리
  const looks = useMemo(() => classmateLooks(character.id), [character.id]);
  const taken = useMemo(() => new Map(CLASSMATES.map((m) => [m.topSeat, m])), []);
  const viewport = useRef<HTMLDivElement>(null);
  const { w: vw, h: vh } = useElementSize(viewport);
  const walker = useMemo(() => makeWalker(top.bounds, top.blockers), []);

  const [pos, setPos] = useState<Pt>(top.start);
  const [dir, setDir] = useState<Dir>('up');
  const [moving, setMoving] = useState(false);
  const [target, setTarget] = useState<Pt | null>(null);

  const posRef = useRef(pos);
  const stick = useRef({ x: 0, y: 0 });
  const keys = useRef(new Set<string>());
  const route = useRef<Pt[]>([]);

  // 방향키/WASD
  useEffect(() => {
    const map: Record<string, string> = { ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd', ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r' };
    const down = (e: KeyboardEvent) => {
      if (map[e.code]) {
        keys.current.add(map[e.code]);
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => map[e.code] && keys.current.delete(map[e.code]);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // 게임 루프
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const k = keys.current;
      let vx = stick.current.x + (k.has('r') ? 1 : 0) - (k.has('l') ? 1 : 0);
      let vy = stick.current.y + (k.has('d') ? 1 : 0) - (k.has('u') ? 1 : 0);
      const mag = Math.hypot(vx, vy);

      if (mag > 0.2) {
        // 직접 조작하면 탭 경로는 취소
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

      const isMoving = vx !== 0 || vy !== 0;
      if (isMoving) {
        const p = route.current.length
          ? { x: posRef.current.x + vx * SPEED * dt, y: posRef.current.y + vy * SPEED * dt } // 경로는 이미 안전
          : walker.step(posRef.current, vx * SPEED * dt, vy * SPEED * dt);
        posRef.current = p;
        setPos(p);
        setDir(Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : vy > 0 ? 'down' : 'up');
      }
      setMoving(isMoving);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [walker]);

  const cam = camera(vw || 1, vh || 1, W, H, ZOOM, pos.x, pos.y, (vw || 1) / 2, (vh || 1) * 0.45);

  const near = useMemo(() => {
    let best: Seat | null = null;
    let bd = NEAR;
    for (const s of top.seats) {
      if (taken.has(s.id)) continue;
      const d = Math.hypot(s.x - pos.x, s.y - pos.y);
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
    return best;
  }, [pos, taken]);

  const walkTo = (p: Pt) => {
    const r = walker.path(posRef.current, p);
    route.current = r;
    setTarget(r.length ? r[r.length - 1] : null);
  };

  const onTap = (e: ReactPointerEvent) => {
    const rect = viewport.current!.getBoundingClientRect();
    walkTo({ x: (e.clientX - rect.left - cam.x) / cam.s, y: (e.clientY - rect.top - cam.y) / cam.s });
  };

  return (
    <div className={styles.wrap}>
      <div ref={viewport} className={styles.viewport} onPointerDown={onTap}>
        <div className={styles.stage} style={{ width: W, height: H, transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.s})` }}>
          <img className={styles.bg} src={top.src} alt="Classroom seen from above" draggable={false} />
          <SunLight variant="top" />

          {top.seats.map((s) => {
            const mate = taken.get(s.id);
            // 친구가 앉은 자리: 캐릭터 + "이름 · 공부 주제" 이름표
            if (mate)
              return (
                <button
                  key={s.id}
                  type="button"
                  className={styles.mate}
                  style={{ left: s.x, top: s.y, height: top.charH * H * 0.92, zIndex: Math.round(s.y) }}
                  aria-label={`${mate.name} is studying ${mate.subject}`}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onPeople();
                  }}
                >
                  <CharacterSprite character={looks[mate.id]} pose="back" />
                  <span className={styles.mateTag}>
                    <b>{mate.name}</b> {mate.subject}
                  </span>
                </button>
              );
            const isNear = near?.id === s.id;
            return (
              <button
                key={s.id}
                type="button"
                className={`${styles.seat} ${isNear ? styles.seatNear : ''}`}
                style={{ left: s.x, top: s.y }}
                aria-label={`Walk to seat ${s.id}`}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  walkTo({ x: s.x, y: s.y });
                }}
              >
                <span className={styles.ring} />
                {isNear && <span className={styles.tag}>{s.id}</span>}
              </button>
            );
          })}

          {target && <span className={styles.target} style={{ left: target.x, top: target.y }} />}

          <div className={styles.me} style={{ left: pos.x, top: pos.y, height: top.charH * H, zIndex: Math.round(pos.y) }}>
            <span className={styles.shadow} />
            <div className={moving ? styles.walking : styles.idle}>
              <CharacterSprite character={character} pose={POSE_OF[dir]} />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.movementControls}>
          {movementAction}
          <Joystick onChange={(v) => (stick.current = v)} />
        </div>
        <div className={styles.side}>
          {near ? (
            <motion.button
              key={near.id}
              type="button"
              className="pill pill-primary"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={() => onSit(near)}
            >
              Sit at {near.id}
            </motion.button>
          ) : (
            <p className={styles.hint}>
              <b>Find your seat</b>
              {CLASSMATES.length} classmates are studying. Walk to a glowing chair — drag the stick or tap the floor.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
