// 투명 유리컵 + 차오르는 음료
// 재료마다 "1:1 반복 액체 텍스처"(거울 반복으로 이음매 없음)를 컵 안쪽 마스크에 채우고, 재료를 넣을 때마다 한 층씩 쌓인다
// 레이어: 유리컵(뒤) → 컵 안쪽 모양으로 잘린 액체 층들 → 표면 물결·거품 → 유리 반사광(앞)
import { motion } from 'framer-motion';
import type { CSSProperties } from 'react';
import styles from './DrinkGlass.module.css';

const base = import.meta.env.BASE_URL;
export const GLASS_SRC = `${base}assets/cafe/glass.png`;

export interface Ingredient {
  id: string;
  name: string;
  tone: string; // 텍스처 평균색(물방울·거품 색)
  fill: number; // 컵 높이에서 차지하는 양(0~1)
  img: string; // 트레이 아이콘
  texture: string; // 반복 액체 텍스처
}
const ing = (id: string, name: string, tone: string, fill: number): Ingredient => ({
  id,
  name,
  tone,
  fill,
  img: `${base}assets/cafe/ingredient-${id}.png`,
  texture: `${base}assets/cafe/liquid-${id}.jpg`,
});
export const INGREDIENTS: Ingredient[] = [
  ing('coffee', 'Coffee', '#5a3219', 0.34),
  ing('milk', 'Milk', '#f4ecdc', 0.26),
  ing('syrup', 'Syrup', '#d98a1f', 0.1),
  ing('strawberry', 'Strawberry', '#ee7d92', 0.22),
  ing('orange', 'Orange', '#f5982a', 0.22),
  ing('matcha', 'Matcha', '#8cb45a', 0.3),
];
export const ingredient = (id: string) => INGREDIENTS.find((i) => i.id === id)!;

export interface CafeDrink {
  base: string;
  additions: string[];
  color: string;
  level: number;
  createdAt: string;
}
export const MAX_LEVEL = 0.92;
export const drinkLayers = (d: Pick<CafeDrink, 'base' | 'additions'>) => [d.base, ...d.additions].filter((id) => INGREDIENTS.some((i) => i.id === id));
export const levelOf = (ids: string[]) => ids.reduce((sum, id) => sum + ingredient(id).fill, 0);

// 넣은 재료의 전체 높이와 대표색(마지막으로 넣은 재료의 색)
export function mix(ids: string[]): Pick<CafeDrink, 'color' | 'level'> {
  return { color: ids.length ? ingredient(ids[ids.length - 1]).tone : '#ffffff', level: Math.min(MAX_LEVEL, levelOf(ids)) };
}

interface Props {
  layers: string[]; // 아래에서 위로 쌓인 재료
  pouring?: string | null; // 지금 붓고 있는 재료
  className?: string;
  style?: CSSProperties;
  still?: boolean; // 들고 다니는 작은 컵: 흐름 애니메이션 없이
}

export function DrinkGlass({ layers, pouring, className, style, still }: Props) {
  const top = layers.length ? ingredient(layers[layers.length - 1]) : null;
  const level = levelOf(layers);
  return (
    <div className={`${styles.glass} ${still ? styles.still : ''} ${className ?? ''}`} style={style}>
      {pouring && <PourStream id={pouring} key={`${pouring}-${layers.length}`} />}
      <img className={styles.img} src={GLASS_SRC} alt="" draggable={false} />
      <div className={styles.inside}>
        {/* 새 재료가 들어올 때 출렁 */}
        <motion.div className={styles.stack} key={layers.length} animate={pouring ? { rotate: [0, -2.4, 1.8, -0.8, 0], y: [0, 2, -1, 0] } : undefined} transition={{ duration: 1.2, delay: 0.5 }}>
          {layers.map((id, i) => {
            const it = ingredient(id);
            return (
              <motion.div
                key={`${id}-${i}`}
                className={`${styles.layer} ${i % 2 ? styles.flowB : styles.flowA}`}
                style={{ backgroundImage: `url(${it.texture})`, zIndex: i }}
                initial={still ? false : { height: 0 }}
                animate={{ height: `${it.fill * 100}%` }}
                transition={{ duration: still ? 0 : 1, delay: still ? 0 : 0.25, ease: [0.3, 0.7, 0.3, 1] }}
              >
                <span className={styles.edge} />
              </motion.div>
            );
          })}
          {/* 맨 위 표면: 살랑이는 하이라이트 */}
          {top && (
            <span className={styles.surface} style={{ bottom: `${level * 100}%`, transitionDuration: still ? '0s' : '1s' }}>
              <i style={{ background: top.tone }} />
            </span>
          )}
        </motion.div>
        {pouring &&
          [26, 44, 62, 74].map((x, i) => <i key={x} className={styles.bubble} style={{ left: `${x}%`, animationDelay: `${0.35 + i * 0.12}s` }} />)}
      </div>
      {/* 유리 반사광은 액체 위에 한 번 더 */}
      <img className={`${styles.img} ${styles.shine}`} src={GLASS_SRC} alt="" draggable={false} />
      {pouring && <Splash tone={ingredient(pouring).tone} level={level} />}
    </div>
  );
}

// 위에서 떨어지는 줄기: 그 재료의 텍스처가 아래로 흘러내린다
function PourStream({ id }: { id: string }) {
  return <span className={styles.stream} style={{ backgroundImage: `url(${ingredient(id).texture})` }} />;
}

// 액체가 닿는 곳에서 튀는 물방울
function Splash({ tone, level }: { tone: string; level: number }) {
  return (
    <span className={styles.splash} style={{ bottom: `${17.5 + level * 76.5}%` }} aria-hidden>
      {[-16, -8, 8, 16, 0].map((dx, i) => (
        <motion.i
          key={i}
          style={{ background: tone }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
          animate={{ x: dx * 1.6, y: [-4, -22 - (i % 3) * 8, 6], scale: [0, 1, 0.5], opacity: [0, 1, 0] }}
          transition={{ duration: 0.75, delay: 0.3 + i * 0.05, ease: 'easeOut' }}
        />
      ))}
    </span>
  );
}
