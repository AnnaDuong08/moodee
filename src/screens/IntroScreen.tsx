// First screen: the MOODEE logo bounces down onto the main illustration, stars twinkle and clouds drift
// Tapping the screen moves on to the friend count setup
import { motion } from 'framer-motion';
import { screenMotion } from '../lib/motion';
import styles from './IntroScreen.module.css';

const base = import.meta.env.BASE_URL;
const STARS = [
  { x: 14, y: 16, d: 0 }, { x: 80, y: 12, d: 0.6 }, { x: 88, y: 34, d: 1.1 }, { x: 8, y: 40, d: 1.5 }, { x: 66, y: 44, d: 0.3 },
];

export function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <motion.main className={`screen ${styles.intro}`} {...screenMotion} onClick={onStart}>
      <motion.img className={styles.art} src={`${base}assets/splash/sky.jpg`} alt="" draggable={false} initial={{ scale: 1.14 }} animate={{ scale: 1 }} transition={{ duration: 2.4, ease: 'easeOut' }} />

      {STARS.map((s, i) => (
        <motion.span key={i} className={styles.star} style={{ left: `${s.x}%`, top: `${s.y}%` }} animate={{ scale: [0.6, 1.15, 0.6], opacity: [0.4, 1, 0.4], rotate: [0, 20, 0] }} transition={{ duration: 2.2, repeat: Infinity, delay: s.d, ease: 'easeInOut' }} />
      ))}
      <span className={`${styles.cloud} ${styles.c1}`} aria-hidden />
      <span className={`${styles.cloud} ${styles.c2}`} aria-hidden />

      {/* Logo: drops from above, bounces, then floats gently */}
      <motion.div className={styles.logoWrap} initial={{ y: -220, opacity: 0, scale: 0.7, rotate: -6 }} animate={{ y: 0, opacity: 1, scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 170, damping: 11, delay: 0.35 }}>
        <motion.img className={styles.logo} src={`${base}assets/brand/logo.png`} alt="MOODEE" animate={{ y: [0, -8, 0], rotate: [0, 1.2, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }} />
      </motion.div>
      <motion.p className={styles.tagline} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }}>
        A cozy world for distracted minds.
      </motion.p>

      <motion.button type="button" className={styles.start} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }} onClick={onStart}>
        <motion.span animate={{ opacity: [1, 0.45, 1] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}>
          Tap to start
        </motion.span>
      </motion.button>
    </motion.main>
  );
}
