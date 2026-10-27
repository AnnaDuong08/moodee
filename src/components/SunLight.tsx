// 왼쪽 창문으로 들어오는 오후 햇살: 빛줄기(천천히 일렁임) + 빛 속을 떠다니는 먼지
import { useMemo } from 'react';
import styles from './SunLight.module.css';

interface Props {
  variant: 'top' | 'back';
}

// 뷰별 빛줄기 배치: [시작 y(%), 두께(%), 각도(deg), 세기]
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
  // 먼지 위치는 고정 시드로 한 번만 생성
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
      {/* 위에서 본 교실은 바닥이 밝아서 전체에 따뜻한 오후 톤을 한 겹 더 */}
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
