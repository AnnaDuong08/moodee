// Demo companion setup (once, on first entering the app): how many friends to be with, 0–4
// Build the friend list once from the number chosen here; don't ask again per space
import { motion } from 'framer-motion';
import { useState } from 'react';
import { CharacterSprite } from '../components/CharacterSprite';
import { BackIcon } from '../components/Icons';
import { CHARACTERS, PLAYABLE } from '../data/characters';
import { getCompanionCount, MAX_COMPANIONS, setCompanionCount } from '../lib/companions';
import { screenMotion } from '../lib/motion';
import styles from './CompanionSetupScreen.module.css';

interface Props {
  onBack?: () => void;
  onDone: () => void;
}

const base = import.meta.env.BASE_URL;
const cloudy = CHARACTERS.find((c) => c.premium)!;

export function CompanionSetupScreen({ onBack, onDone }: Props) {
  const [count, setCount] = useState(() => getCompanionCount() ?? 2);
  // Preview: with 4, the last spot is Cloudy
  const preview = Array.from({ length: count }, (_, i) => (count === MAX_COMPANIONS && i === 3 ? cloudy : PLAYABLE[(i + 1) % PLAYABLE.length]));

  return (
    <motion.main className={`screen ${styles.setup}`} {...screenMotion}>
      <img className={styles.sky} src={`${base}assets/splash/sky.jpg`} alt="" draggable={false} />
      <header className={styles.top}>
        {onBack && (
          <button type="button" className="icon-btn" onClick={onBack} aria-label="Back">
            <BackIcon />
          </button>
        )}
      </header>

      <motion.img className={styles.logo} src={`${base}assets/brand/logo.png`} alt="MOODEE" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 16 }} />

      <section className={styles.card}>
        <h1>How many friends are joining you?</h1>
        <p>They will be somewhere in the world — you might bump into them.</p>

        <div className={styles.preview} aria-hidden>
          {preview.length === 0 ? (
            <span className={styles.solo}>Just me today</span>
          ) : (
            preview.map((c, i) => (
              <motion.span key={`${c.id}-${i}`} className={styles.friend} initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.06 }}>
                <CharacterSprite character={c} pose="front" />
              </motion.span>
            ))
          )}
        </div>

        <div className={styles.counts} role="radiogroup" aria-label="Number of friends">
          {[0, 1, 2, 3, 4].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={count === n} className={count === n ? styles.on : ''} onClick={() => setCount(n)}>
              {n}
            </button>
          ))}
        </div>
        <small>{count === MAX_COMPANIONS ? 'With four friends, Cloudy comes along too.' : 'Don’t worry — you can change this later.'}</small>

        <button
          type="button"
          className="pill pill-primary"
          onClick={() => {
            setCompanionCount(count);
            onDone();
          }}
        >
          Continue
        </button>
      </section>
    </motion.main>
  );
}
