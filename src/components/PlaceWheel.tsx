// 장소 휠: 화면 아래의 큰 둥근 지형(휠) 위에 장소가 둘레를 따라 놓인다. 끌거나 탭하면 휠이 돌고 맨 위 장소가 선택됨
// 선택된 장소는 휠 꼭대기에 크게 서 있고, 양옆 장소는 곡면을 따라 기울어지며 작고 흐리게 물러난다
// 건물 발판은 휠 표면에 닿도록(살짝 묻히게) 맞추고, 캐릭터는 그 앞 표면에 발을 딛는다
import { animate, useMotionValue, useMotionValueEvent } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { Character, Pose } from '../data/characters';
import type { Place } from '../data/places';
import { CharacterSprite } from './CharacterSprite';
import { PlaceIcon } from './PlaceIcon';
import styles from './PlaceWheel.module.css';

interface Props {
  places: Place[];
  character: Character;
  index: number;
  onIndexChange: (i: number) => void;
  going: boolean; // 버튼을 누른 뒤 이동 연출 중
  onWalkingChange?: (walking: boolean) => void;
}

const STEP = 32; // 장소 사이 각도: 양옆 장소가 화면 가장자리에 걸치도록
const DRAG_DEG_PER_PX = 0.2;
const BURY = 0.05; // 발판이 지형에 묻히는 깊이(아이콘 폭 대비)

// 아이콘 이미지별 비율(높이/폭)과 발판 맨 아래의 세로 위치(이미지 높이 대비)
const ICON_BASE: Record<string, { aspect: number; base: number }> = {
  classroom: { aspect: 320 / 480, base: 0.94 },
  cafe: { aspect: 1, base: 0.83 },
  library: { aspect: 1, base: 0.825 },
  museum: { aspect: 1, base: 0.855 },
  'my-room': { aspect: 1, base: 0.82 },
};

export function PlaceWheel({ places, character, index, onIndexChange, going, onWalkingChange }: Props) {
  const n = places.length;
  const rot = useMotionValue(-index * STEP);
  const [angle, setAngle] = useState(rot.get());
  const [pose, setPose] = useState<Pose>('front');
  const drag = useRef<{ id: number; x: number; start: number; moved: boolean } | null>(null);
  const idleTimer = useRef<number>(0);

  // 휠이 도는 방향에 따라 캐릭터가 옆모습으로 걷는다
  useMotionValueEvent(rot, 'change', (v) => {
    const vel = rot.getVelocity();
    setAngle(v);
    if (Math.abs(vel) > 8) {
      setPose(vel > 0 ? 'side' : 'sideAlt');
      onWalkingChange?.(true);
      window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => {
        setPose('front');
        onWalkingChange?.(false);
      }, 180);
    }
  });

  const selectedFrom = (r: number) => ((Math.round(-r / STEP) % n) + n) % n;

  const snapTo = (target: number) => {
    animate(rot, target, { type: 'spring', stiffness: 120, damping: 20 });
    onIndexChange(selectedFrom(target));
  };

  // 가장 가까운 방향으로 i번 장소를 맨 위로
  const goToIndex = (i: number) => {
    const cur = rot.get();
    const base = -i * STEP;
    const cycle = n * STEP;
    const k = Math.round((cur - base) / cycle);
    snapTo(base + k * cycle);
  };

  // 출발: 제자리에서 한 바퀴 걸어가는 연출
  useEffect(() => {
    if (!going) return;
    const c = animate(rot, rot.get() - n * STEP, { duration: 1.9, ease: [0.45, 0, 0.25, 1] });
    return () => c.stop();
  }, [going, rot, n]);

  useEffect(() => () => window.clearTimeout(idleTimer.current), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (going) return;
      if (e.key === 'ArrowLeft') goToIndex((index - 1 + n) % n);
      if (e.key === 'ArrowRight') goToIndex((index + 1) % n);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const walking = pose !== 'front';
  const c = -angle / STEP; // 지금 맨 위에 있는 (연속) 인덱스

  return (
    <div
      className={styles.wheelArea}
      onPointerDown={(e) => {
        if (going) return;
        rot.stop();
        drag.current = { id: e.pointerId, x: e.clientX, start: rot.get(), moved: false };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        const dx = e.clientX - d.x;
        if (Math.abs(dx) > 4) d.moved = true;
        rot.set(d.start + dx * DRAG_DEG_PER_PX);
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        drag.current = null;
        if (!d) return;
        if (d.moved) {
          const projected = rot.get() + rot.getVelocity() * 0.15;
          snapTo(Math.round(projected / STEP) * STEP);
        } else {
          const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-place-index]');
          if (el) goToIndex(Number(el.dataset.placeIndex));
        }
      }}
    >
      <div className={styles.disc} aria-hidden />

      <ul className={styles.ring} role="listbox" aria-label="Places" aria-activedescendant={`place-${places[index].id}`}>
        {places.map((p, i) => {
          // 맨 위(0°)로부터 몇 칸 떨어졌는지(감싸서 -n/2 ~ n/2)
          const off = ((((i - c) % n) + n + n / 2) % n) - n / 2;
          const a = off * STEP;
          const t = Math.min(1, Math.abs(off)); // 0 = 선택, 1 = 바로 옆
          const far = Math.max(0, Math.abs(off) - 1); // 바로 옆보다 먼 장소는 휠 아래로 사라짐
          const g = ICON_BASE[p.id] ?? { aspect: 1, base: 0.85 };
          return (
            <li
              key={p.id}
              id={`place-${p.id}`}
              role="option"
              aria-selected={i === index}
              data-place-index={i}
              className={styles.slot}
              style={{
                transform: `rotate(${a}deg) translateY(calc(var(--disc) / -2))`,
                opacity: Math.max(0, 1 - 0.55 * t - far * 1.4),
                zIndex: Math.round(10 - t * 5),
                ['--s' as string]: 1 - t * 0.5,
                ['--blur' as string]: `${t * 2.2}px`,
                ['--here' as string]: Math.max(0, 1 - t),
              }}
            >
              <span className={styles.glow} />
              <span className={styles.contact} />
              <div
                className={styles.iconWrap}
                style={{
                  top: `calc(var(--icon) * ${-(g.aspect * g.base - BURY)})`,
                  transformOrigin: `50% ${g.base * 100}%`,
                  ['--fade1' as string]: `${(g.base - (BURY + 0.025) / g.aspect) * 100}%`,
                  ['--fade2' as string]: `${(g.base - (BURY - 0.015) / g.aspect) * 100}%`,
                }}
              >
                <PlaceIcon place={p} className={styles.icon} />
              </div>
            </li>
          );
        })}
      </ul>

      {/* 캐릭터: 맨 위 장소 앞, 휠 표면에 발을 딛고 선다 */}
      <div className={styles.walker}>
        <span className={styles.shadow} />
        <div className={walking || going ? styles.walking : styles.idle}>
          <CharacterSprite character={character} pose={going ? 'sideAlt' : pose} />
        </div>
      </div>
    </div>
  );
}
