// Loading screen: shows a random Cloudee illustration on app open and when moving to a place
// Floating clouds on top, bouncing dots and a filling progress bar below
import { motion } from 'framer-motion';
import styles from './LoadingSplash.module.css';

const NAMES = [
  'airport-travel', 'autumn', 'beach', 'birthday', 'cafe-barista', 'cherry-blossom', 'christmas', 'chuseok-moon', 'classroom',
  'halloween', 'hanbok-spring', 'painter', 'rainy-day', 'sky', 'sleeping', 'studying', 'winter-snow',
];
const src = (n: string) => `${import.meta.env.BASE_URL}assets/splash/${n}.jpg`;

// Pick and preload the next picture in advance (so the same one doesn't appear twice in a row)
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
  label: string; // e.g. "Going to Café…"
  duration: number; // Time for the progress bar to fill (seconds)
  logo?: boolean; // On app open: logo intro
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
