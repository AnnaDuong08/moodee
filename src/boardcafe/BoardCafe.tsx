// Board Café: game shelf → friends gather at the table → box is set down and the lid opens → game → result card → back to the table
// Not a "winning game" but low-pressure co-op where you finish something together. No failure screen or red warnings
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { CharacterSprite } from '../components/CharacterSprite';
import { Sparkles } from '../components/Coin';
import type { Character } from '../data/characters';
import { CloudTiles } from './CloudTiles';
import { LANGS, setLang, useLang, type Lang } from '../i18n';
import { t } from './i18n';
import { WordRelay } from './WordRelay';
import styles from './boardcafe.module.css';

const base = import.meta.env.BASE_URL;
const A = (f: string) => `${base}assets/boardcafe/${f}`;

type GameId = 'tiles' | 'relay';
type Phase = 'shelf' | 'gather' | 'play' | 'result';

const SHELF = [
  { id: 'tiles' as const, title: 'Cloud Tiles', cover: A('cloudtiles-cover.png'), players: '2–4', time: '2 min', tint: '#cfe0fb' },
  { id: 'relay' as const, title: 'Word Relay', cover: A('wordrelay-arrow.png'), players: '2–4', time: '1 min', tint: '#fde6cf' },
  { id: 'match' as const, title: 'Cloud Match', cover: A('card-cloud_dream.jpg'), players: '2–4', time: '1 min', tint: '#e6defa', soon: true },
];

interface Props {
  me: Character;
  luna: Character;
  hieu: Character;
  drink: string[] | null;
  onClose: () => void;
}

export function BoardCafe({ me, luna, hieu, drink, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('shelf');
  const [game, setGame] = useState<GameId>('tiles');
  const lang = useLang();
  const [langOpen, setLangOpen] = useState(false);
  const [boxOpen, setBoxOpen] = useState(false);
  const [result, setResult] = useState(0);
  const [hint, setHint] = useState<string | null>(null);

  const pick = (id: GameId) => {
    setGame(id);
    setPhase('gather');
    setBoxOpen(false);
    // Box lands on the table (0.5s) → lid opens (1.3s) → game starts
    window.setTimeout(() => setBoxOpen(true), 1300);
    window.setTimeout(() => setPhase('play'), 2400);
  };

  const chooseLang = (l: Lang) => {
    setLang(l);
    setLangOpen(false);
  };
  // Word Relay's word list depends on the language, so it can't change mid-round
  const langLocked = phase === 'play' && game === 'relay';

  const finish = (n: number) => {
    setResult(n);
    setPhase('result');
  };

  return (
    <motion.section className={styles.overlay} aria-label="Board café" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className={styles.topBar}>
        <button type="button" className={styles.round} onClick={onClose} aria-label="Back to the table">
          ‹
        </button>
        <span className={styles.title}>{phase === 'shelf' ? 'Game Shelf' : game === 'tiles' ? 'Cloud Tiles' : 'Word Relay'}</span>
        <div className={styles.lang}>
          <button type="button" className={styles.langBtn} onClick={() => setLangOpen((o) => !o)} disabled={langLocked} aria-haspopup="menu" aria-expanded={langOpen} aria-label={`${t(lang, 'language')}: ${LANGS.find((l) => l.id === lang)?.label}`}>
            🌐 {LANGS.find((l) => l.id === lang)?.short}
          </button>
          <AnimatePresence>
            {langOpen && !langLocked && (
              <motion.div className={styles.langMenu} role="menu" initial={{ opacity: 0, y: -6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.96 }} transition={{ duration: 0.18 }}>
                {LANGS.map((l) => (
                  <button key={l.id} type="button" role="menuitemradio" aria-checked={lang === l.id} className={lang === l.id ? styles.langOn : ''} onClick={() => chooseLang(l.id)}>
                    <span>{l.short}</span>
                    {l.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {phase === 'shelf' && (
          <motion.div key="shelf" className={styles.shelfWrap} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <p className={styles.lead}>{t(lang, 'lead')}</p>
            <div className={styles.shelf}>
              {SHELF.map((b, i) => (
                <motion.button
                  key={b.id}
                  type="button"
                  className={`${styles.box} ${b.soon ? styles.boxSoon : ''}`}
                  style={{ ['--tint' as string]: b.tint }}
                  initial={{ y: 30, opacity: 0, rotate: -3 }}
                  animate={{ y: 0, opacity: 1, rotate: 0 }}
                  transition={{ delay: 0.08 * i, type: 'spring', stiffness: 260, damping: 18 }}
                  whileHover={b.soon ? undefined : { y: -6, rotate: -1.5 }}
                  whileTap={b.soon ? undefined : { scale: 0.95 }}
                  onClick={() => {
                    if (b.soon) {
                      setHint(t(lang, 'comingSoon'));
                      window.setTimeout(() => setHint(null), 1800);
                    } else if (b.id !== 'match') pick(b.id);
                  }}
                  aria-label={`${b.title}, ${b.players} players, ${b.time}${b.soon ? ', coming soon' : ''}`}
                >
                  <span className={styles.boxArt}>
                    <img src={b.cover} alt="" draggable={false} />
                  </span>
                  <b>{b.title}</b>
                  <small>
                    👥 {b.players} · ⏱ {b.time}
                  </small>
                  {b.soon && <span className={styles.soon}>🔒 {t(lang, 'soonBadge')}</span>}
                </motion.button>
              ))}
            </div>
            <div className={styles.plank} aria-hidden />
            <motion.img className={styles.peek} src={A('cloudee-peek.png')} alt="" initial={{ y: 40, opacity: 0 }} animate={{ y: [0, -8, 0], opacity: 1 }} transition={{ opacity: { delay: 0.4 }, y: { duration: 3, repeat: Infinity, ease: 'easeInOut' } }} />
            <AnimatePresence>
              {hint && (
                <motion.p className={styles.hint} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {hint}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {phase === 'gather' && (
          <motion.div key="gather" className={styles.gather} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={styles.friendL} initial={{ x: -160, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 16 }}>
              <CharacterSprite character={luna} pose="sideAlt" />
              <span>Luna</span>
            </motion.div>
            <motion.div className={styles.friendR} initial={{ x: 160, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 16, delay: 0.15 }}>
              <CharacterSprite character={hieu} pose="side" />
              <span>Hieu</span>
            </motion.div>
            <div className={styles.boxStage}>
              <AnimatePresence mode="popLayout">
                {!boxOpen ? (
                  <motion.img key="closed" src={A('gamebox-closed.png')} alt="Game box" initial={{ y: -260, rotate: -8, opacity: 0 }} animate={{ y: 0, rotate: 0, opacity: 1 }} exit={{ scale: 1.08, opacity: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 13, delay: 0.35 }} />
                ) : (
                  <motion.img key="open" src={A('gamebox-open.png')} alt="Open game box" initial={{ scale: 0.9 }} animate={{ scale: [0.9, 1.12, 1] }} transition={{ duration: 0.5 }} />
                )}
              </AnimatePresence>
              {boxOpen && <Sparkles count={14} />}
            </div>
            <p className={styles.gatherText}>{boxOpen ? t(lang, 'letsPlay') : t(lang, 'gather')}</p>
          </motion.div>
        )}

        {phase === 'play' && (
          <motion.div key="play" className={styles.playWrap} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            {game === 'tiles' ? <CloudTiles me={me} luna={luna} hieu={hieu} drink={drink} lang={lang} onFinish={finish} /> : <WordRelay lang={lang} onFinish={finish} />}
          </motion.div>
        )}

        {phase === 'result' && (
          <motion.div key="result" className={styles.resultWrap} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={styles.resultCard} initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
              <img src={A(game === 'tiles' && result >= 3 ? 'reaction-celebrate.png' : 'reaction-nice.png')} alt="" />
              {game === 'tiles' ? (
                <>
                  <h2>{result >= 3 ? t(lang, 'allClouds') : t(lang, 'closing')}</h2>
                  <p>{t(lang, 'cloudsMade', { n: result, s: result === 1 ? '' : 's' })}</p>
                  <div className={styles.resultClouds}>
                    {[0, 1, 2].map((i) => (
                      <motion.span key={i} className={i < result ? styles.cloudOn : ''} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 + i * 0.15, type: 'spring' }}>
                        ☁
                      </motion.span>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <h2>{t(lang, 'niceChain')}</h2>
                  <p>{t(lang, 'wordsChained', { n: result })}</p>
                </>
              )}
              <div className={styles.resultBtns}>
                <button type="button" onClick={() => setPhase('shelf')}>
                  {t(lang, 'anotherGame')}
                </button>
                <button type="button" className={styles.primary} onClick={onClose}>
                  {t(lang, 'backToTable')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
