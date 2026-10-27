// Place wheel: places sit around the rim of a large round terrain (wheel) at the bottom of the screen. Drag or tap to spin; the top place is selected
// The selected place stands large at the top of the wheel; neighbors tilt along the curve and recede smaller and fainter
// Building bases are aligned to touch (slightly sink into) the wheel surface, and the character stands on the surface in front
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
  going: boolean; // Travel animation in progress after pressing the button
  onWalkingChange?: (walking: boolean) => void;
}

const STEP = 32; // Angle between places: so the neighbors straddle the screen edges
const DRAG_DEG_PER_PX = 0.2;
const BURY = 0.05; // How deep the base sinks into the terrain (relative to icon width)

// Per-icon image ratio (height/width) and vertical position of the base bottom (relative to image height)
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

  // The character walks in side view depending on the wheel's spin direction
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

  // Bring place i to the top via the shortest direction
  const goToIndex = (i: number) => {
    const cur = rot.get();
    const base = -i * STEP;
    const cycle = n * STEP;
    const k = Math.round((cur - base) / cycle);
    snapTo(base + k * cycle);
  };

  // Departure: walk-in-place animation for one spin
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
  const c = -angle / STEP; // The (continuous) index currently at the top

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
          // How many steps from the top (0°) (wrapped to -n/2 – n/2)
          const off = ((((i - c) % n) + n + n / 2) % n) - n / 2;
          const a = off * STEP;
          const t = Math.min(1, Math.abs(off)); // 0 = selected, 1 = immediate neighbor
          const far = Math.max(0, Math.abs(off) - 1); // Places farther than the immediate neighbors disappear below the wheel
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

      {/* Character: stands with feet on the wheel surface in front of the top place */}
      <div className={styles.walker}>
        <span className={styles.shadow} />
        <div className={walking || going ? styles.walking : styles.idle}>
          <CharacterSprite character={character} pose={going ? 'sideAlt' : pose} />
        </div>
      </div>
    </div>
  );
}
