// Character select: choose by swipe/arrows/thumbnails and confirm with the bottom button
import { AnimatePresence, motion, type PanInfo, type Variants } from 'framer-motion';
import { useState } from 'react';
import { CharacterSprite } from '../components/CharacterSprite';
import { CoinChip, Sparkles } from '../components/Coin';
import { BackIcon, CoinIcon, LockIcon } from '../components/Icons';
import { CLOUDEE_PRICE } from '../config/economy';
import { hasCloudee, unlockCloudee, useWallet } from '../lib/wallet';
import { CHARACTERS, type CharacterId } from '../data/characters';
import { useT } from '../i18n';
import { screenMotion } from '../lib/motion';
import styles from './CharacterSelectScreen.module.css';

interface Props {
  initialId: CharacterId | null;
  onBack?: () => void; // Nowhere to go back to on first launch
  onConfirm: (id: CharacterId) => void;
}

const slide: Variants = {
  enter: (dir: number) => ({ x: dir * 120, opacity: 0, scale: 0.94 }),
  center: { x: 0, opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 26 } },
  exit: (dir: number) => ({ x: dir * -120, opacity: 0, scale: 0.94, transition: { duration: 0.18 } }),
};

export function CharacterSelectScreen({ initialId, onBack, onConfirm }: Props) {
  const t = useT();
  const [[index, dir], setState] = useState<[number, number]>(() => [
    Math.max(0, CHARACTERS.findIndex((c) => c.id === initialId)),
    0,
  ]);
  const current = CHARACTERS[index];
  // Locked Cloudees are unlocked with coins
  const wallet = useWallet();
  // Cloudy is MOODEE PRO only (no payment: info only). Choose 4 friends to meet it in the world
  // Premium-locked without Pro; selectable right away with Pro
  const premium = !!current.premium && wallet.plan !== 'pro';
  const [proNote, setProNote] = useState(false);
  const locked = !current.premium && !hasCloudee(wallet, current);
  const short = wallet.coins < CLOUDEE_PRICE;
  const [justUnlocked, setJustUnlocked] = useState<string | null>(null);

  const unlock = () => {
    if (!unlockCloudee(current.id)) return;
    setJustUnlocked(current.id);
    window.setTimeout(() => setJustUnlocked(null), 1000);
  };

  const go = (next: number) => {
    const n = (next + CHARACTERS.length) % CHARACTERS.length;
    if (n === index) return;
    setState([n, next > index ? 1 : -1]);
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -50 || info.velocity.x < -400) go(index + 1);
    else if (info.offset.x > 50 || info.velocity.x > 400) go(index - 1);
  };

  return (
    <motion.main className={`screen ${styles.select}`} {...screenMotion}>
      <header className={styles.top}>
        {onBack ? (
          <button type="button" className="icon-btn" onClick={onBack} aria-label={t('Back to home')}>
            <BackIcon />
          </button>
        ) : (
          <span className={styles.spacer} />
        )}
        <div className={styles.titles}>
          {/* On first launch (nowhere to go back to), also show the app introduction */}
          {onBack ? (
            <span className={styles.eyebrow}>{t('Your Cloudee')}</span>
          ) : (
            <>
              <img className={styles.logo} src={`${import.meta.env.BASE_URL}assets/brand/logo.png`} alt="MOODEE" />
              <p className={styles.intro}>{t('A cozy world for distracted minds.')}</p>
            </>
          )}
          <h1>{t('Who’s studying today?')}</h1>
        </div>
        <CoinChip className={styles.coinChip} />
      </header>

      <section className={styles.stage} aria-roledescription="carousel" aria-label={t('Characters')}>
        <div className={styles.halo} aria-hidden />
        <div className={styles.floor} aria-hidden />

        <AnimatePresence custom={dir} initial={false} mode="popLayout">
          <motion.div
            key={current.id}
            className={styles.hero}
            custom={dir}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={onDragEnd}
          >
            <motion.div
              className={styles.bob}
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <CharacterSprite character={current} pose="front" className={locked || premium ? styles.lockedSprite : ''} />
              {current.premium && <span className={styles.proBadge}>MOODEE PRO</span>}
              {(locked || premium) && (
                <span className={`${styles.bigLock} ${premium ? styles.proLock : ''}`}>
                  <LockIcon width={30} height={30} />
                </span>
              )}
              {justUnlocked === current.id && <Sparkles count={14} />}
            </motion.div>
          </motion.div>
        </AnimatePresence>

        <button type="button" className={`${styles.arrow} ${styles.prev}`} onClick={() => go(index - 1)} aria-label={t('Previous character')}>
          <BackIcon />
        </button>
        <button type="button" className={`${styles.arrow} ${styles.next}`} onClick={() => go(index + 1)} aria-label={t('Next character')}>
          <BackIcon style={{ transform: 'scaleX(-1)' }} />
        </button>
      </section>

      <div className={styles.info} aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            <h2>{current.name}</h2>
            <p>{t(premium ? 'Locked — a premium Cloudee for MOODEE PRO members.' : locked ? 'Locked — unlock with coins you earn by studying.' : current.vibe)}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <ul className={styles.thumbs} role="tablist" aria-label={t('Pick a character')}>
        {CHARACTERS.map((c, i) => (
          <li key={c.id}>
            <button
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={c.name}
              className={`${styles.thumb} ${i === index ? styles.thumbOn : ''}`}
              onClick={() => go(i)}
            >
              <CharacterSprite character={c} pose="front" className={`${styles.thumbSprite} ${hasCloudee(wallet, c) ? '' : styles.lockedSprite}`} style={c.premium ? { height: '250%', top: '-112%' } : { height: '240%' }} />
              {!hasCloudee(wallet, c) && (
                <span className={styles.thumbLock}>
                  <LockIcon width={11} height={11} />
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <div className={styles.dock}>
        {premium ? (
          <button type="button" className={`pill pill-primary ${styles.proCta}`} onClick={() => setProNote(true)}>
            <LockIcon width={18} height={18} /> {t('Unlock with MOODEE PRO')}
          </button>
        ) : locked ? (
          <button type="button" className="pill pill-primary" onClick={unlock} disabled={short}>
            <CoinIcon /> {t(short ? '{n} coins · study to earn' : '{n} coins to unlock', { n: CLOUDEE_PRICE })}
          </button>
        ) : (
          <button type="button" className="pill pill-primary" onClick={() => onConfirm(current.id)}>
            {t('Continue as {name}', { name: current.name })}
          </button>
        )}
      </div>

      <AnimatePresence>
        {proNote && (
          <motion.div className={styles.proBackdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setProNote(false)}>
            <motion.div className={styles.proModal} role="dialog" aria-modal="true" aria-label="MOODEE PRO" initial={{ scale: 0.9, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
              <h2>{t('Available with MOODEE PRO')}</h2>
              <p>{t('Cloudy is a paid Cloudee. No payment in this demo — bring 4 friends and Cloudy visits the world with you.')}</p>
              <button type="button" className="pill pill-soft" onClick={() => setProNote(false)}>
                {t('Got it')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  );
}
