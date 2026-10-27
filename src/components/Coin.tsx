// Shared coin UI: number count-up, sparkle burst, unlock modal
import { animate, AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '../i18n';
import { useWallet } from '../lib/wallet';
import { CoinIcon, LockIcon } from './Icons';
import styles from './Coin.module.css';

// When the value changes, count up from the old value to the new one like rolling
export function CountUp({ value, duration = 0.7 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const controls = animate(from.current, value, { duration, ease: 'easeOut', onUpdate: (v) => setShown(Math.round(v)) });
    from.current = value;
    return () => controls.stop();
  }, [value, duration]);
  return <>{shown}</>;
}

// Coin balance chip (tap to go to Membership, etc.). Bounces when the balance changes
export function CoinChip({ onClick, className }: { onClick?: () => void; className?: string }) {
  const { coins } = useWallet();
  const t = useT();
  const Tag = (onClick ? motion.button : motion.span) as typeof motion.button;
  return (
    <Tag key={coins} type={onClick ? 'button' : undefined} className={`${styles.chip} ${className ?? ''}`} onClick={onClick} aria-label={t('{n} coins', { n: coins })} initial={{ scale: 1.18 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 14 }}>
      <CoinIcon />
      <b>
        <CountUp value={coins} />
      </b>
    </Tag>
  );
}

// Little stars spreading out from the center (moments of reward or unlock)
export function Sparkles({ count = 10 }: { count?: number }) {
  return (
    <span className={styles.sparkles} aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2;
        const r = 58 + (i % 3) * 18;
        return (
          <motion.i
            key={i}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
            animate={{ x: Math.cos(a) * r, y: Math.sin(a) * r, scale: [0, 1.1, 0.6], opacity: [1, 1, 0] }}
            transition={{ duration: 0.9, delay: (i % 4) * 0.04, ease: 'easeOut' }}
          />
        );
      })}
    </span>
  );
}

interface UnlockProps {
  open: boolean;
  title: string; // e.g. "Unlock this hair style?"
  price: number;
  preview: ReactNode;
  onCancel: () => void;
  onConfirm: () => boolean; // Whether it succeeded
}

// "Unlock this …? 100 coins" modal. If coins are short, disable the button and suggest earning them by studying
export function UnlockModal({ open, title, price, preview, onCancel, onConfirm }: UnlockProps) {
  const { coins } = useWallet();
  const [done, setDone] = useState(false);
  const t = useT();
  const short = coins < price;

  useEffect(() => {
    if (open) setDone(false);
  }, [open]);

  const confirm = () => {
    if (!onConfirm()) return;
    setDone(true);
    window.setTimeout(onCancel, 900);
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className={styles.backdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel}>
          <motion.div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ scale: 0.88, y: 16 }}
            animate={{ scale: 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 22 } }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.preview}>
              {preview}
              {done ? <Sparkles /> : <span className={styles.lock}><LockIcon width={16} height={16} /></span>}
            </div>
            <div className={styles.body}>
              <h2>{done ? t('Unlocked!') : title}</h2>
              <p className={styles.price}>
                <CoinIcon /> <b>{t('{n} coins', { n: price })}</b>
                <span>{t('· you have {n}', { n: coins })}</span>
              </p>
            </div>
            <div className={styles.actions}>
              <button type="button" className="pill pill-soft" onClick={onCancel}>
                {t(done ? 'Close' : 'Cancel')}
              </button>
              <button type="button" className="pill pill-primary" onClick={confirm} disabled={short || done}>
                {done ? t('Yours now') : short ? t('Study to earn coins') : t('{n} coins to unlock', { n: price })}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.querySelector('.phone') ?? document.body,
  );
}
