// Language chip: shows the current language and opens a small menu of the four languages (changes the whole app)
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { LANGS, setLang, useLang, useT } from '../i18n';
import { GlobeIcon } from './Icons';
import styles from './LanguageButton.module.css';

export function LanguageButton({ className }: { className?: string }) {
  const lang = useLang();
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANGS.find((l) => l.id === lang)!;

  // Close on a tap outside or Escape
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  return (
    <div className={styles.wrap} ref={ref}>
      <button type="button" className={className} onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label={`${t('Language')}: ${current.label}`}>
        <GlobeIcon width={18} height={18} />
        <b>{current.short}</b>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className={styles.menu} role="menu" initial={{ opacity: 0, y: -6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.96 }} transition={{ duration: 0.18 }}>
            {LANGS.map((l) => (
              <button
                key={l.id}
                type="button"
                role="menuitemradio"
                aria-checked={lang === l.id}
                className={lang === l.id ? styles.on : ''}
                onClick={() => {
                  setLang(l.id);
                  setOpen(false);
                }}
              >
                <span>{l.short}</span>
                {l.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
