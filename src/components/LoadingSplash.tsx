// 로딩 화면: 앱을 열 때·장소로 이동할 때 Cloudee 일러스트 한 장을 무작위로 보여 준다
// 위에는 떠다니는 구름, 아래에는 통통 튀는 점과 차오르는 진행 바
import { motion } from 'framer-motion';
import styles from './LoadingSplash.module.css';

const NAMES = [
  'airport-travel', 'autumn', 'beach', 'birthday', 'cafe-barista', 'cherry-blossom', 'christmas', 'chuseok-moon', 'classroom',
  'halloween', 'hanbok-spring', 'painter', 'rainy-day', 'sky', 'sleeping', 'studying', 'winter-snow',
];
const src = (n: string) => `${import.meta.env.BASE_URL}assets/splash/${n}.jpg`;

// 다음에 보여 줄 그림을 미리 골라 받아 둔다(같은 그림이 연달아 나오지 않게)
let last = '';
let next = '';
function queue() {
  do next = NAMES[Math.floor(Math.random() * NAMES.length)];
  while (next === last);
  new Image().src = src(next);
}
queue();

export function pickSplash() {
  last = next;
  queue();
  return src(last);
}

interface Props {
  image: string;
  label: string; // 예: "Going to Café…"
  duration: number; // 진행 바가 차는 시간(초)
  logo?: boolean; // 앱을 열 때: 로고 인트로
}

export function LoadingSplash({ image, label, duration, logo }: Props) {
  return (
    <motion.div className={styles.splash} role="status" aria-live="polite" aria-label={label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
      <motion.img className={styles.art} src={image} alt="" draggable={false} initial={{ scale: 1.12 }} animate={{ scale: 1 }} transition={{ duration: duration + 0.6, ease: 'easeOut' }} />

      {logo && <motion.img className={styles.logo} src={`${import.meta.env.BASE_URL}assets/brand/logo.png`} alt="MOODEE" initial={{ opacity: 0, scale: 0.8, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.7, ease: 'easeOut' }} />}
      <div className={styles.top} aria-hidden>
        <span className={`${styles.cloud} ${styles.c1}`} />
        <span className={`${styles.cloud} ${styles.c2}`} />
        <span className={`${styles.cloud} ${styles.c3}`} />
      </div>

      <div className={styles.bottom}>
        <div className={styles.dots} aria-hidden>
          {[0, 1, 2].map((i) => (
            <motion.i key={i} animate={{ y: [0, -12, 0], scaleY: [1, 1.08, 0.92, 1] }} transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.14, ease: 'easeInOut' }} />
          ))}
        </div>
        <p>{label}</p>
        <div className={styles.bar} aria-hidden>
          <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration, ease: 'easeInOut' }} />
        </div>
      </div>
    </motion.div>
  );
}
