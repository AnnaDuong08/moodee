// Afternoon sunlight through the left window: light beams (slowly shimmering) + dust floating in the light
import { useMemo } from 'react';
import styles from './SunLight.module.css';

interface Props {
  variant: 'top' | 'back';
}

// Light beam layout per view: [start y (%), thickness (%), angle (deg), strength]
const BEAMS: Record<Props['variant'], [number, number, number, number][]> = {
  back: [
    [4, 9, 30, 0.9],
    [11, 6, 33, 0.7],
    [17, 11, 31, 0.85],
    [27, 7, 34, 0.6],
  ],
  top: [
    [6, 9, 24, 1],
    [18, 12, 26, 1],
    [31, 8, 25, 0.9],
    [43, 11, 27, 1],
    [56, 7, 26, 0.8],
  ],
};

export function SunLight({ variant }: Props) {
  // Dust positions are generated once with a fixed seed
  const motes = useMemo(() => {
    let s = variant === 'top' ? 7 : 3;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    return Array.from({ length: 26 }, () => ({
      left: 4 + rnd() * 70,
      top: (variant === 'top' ? 10 : 12) + rnd() * 50,
      size: 2 + rnd() * 3,
      dur: 7 + rnd() * 8,
      delay: -rnd() * 12,
    }));
  }, [variant]);

  return (
    <div className={styles.sun} aria-hidden>
      <div className={`${styles.glow} ${variant === 'top' ? styles.glowTop : ''}`} />
      {/* The top-view classroom has a bright floor, so add one more layer of warm afternoon tone over everything */}
      {variant === 'top' && <div className={styles.warm} />}
      {BEAMS[variant].map(([top, h, angle, k], i) => (
        <div
          key={i}
          className={styles.beam}
          style={{ top: `${top}%`, height: `${h}%`, rotate: `${angle}deg`, opacity: k, animationDelay: `${-i * 2.3}s` }}
        />
      ))}
      {motes.map((m, i) => (
        <span
          key={i}
          className={styles.mote}
          style={{ left: `${m.left}%`, top: `${m.top}%`, width: m.size, height: m.size, animationDuration: `${m.dur}s`, animationDelay: `${m.delay}s` }}
        />
      ))}
    </div>
  );
}
