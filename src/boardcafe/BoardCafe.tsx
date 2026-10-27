// 보드카페: 게임 선반 → 친구들이 테이블로 모임 → 상자가 놓이고 뚜껑이 열림 → 게임 → 결과 카드 → 테이블로
// "이기는 게임"이 아니라 같이 하나를 완성하는 저압박 협동. 실패 화면·빨간 경고 없음
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { CharacterSprite } from '../components/CharacterSprite';
import { Sparkles } from '../components/Coin';
import type { Character } from '../data/characters';
import { CloudTiles } from './CloudTiles';
import type { Lang } from './npc';
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
  const [lang, setLang] = useState<Lang>('en');
  const [boxOpen, setBoxOpen] = useState(false);
  const [result, setResult] = useState(0);
  const [hint, setHint] = useState<string | null>(null);

  const pick = (id: GameId) => {
    setGame(id);
    setPhase('gather');
    setBoxOpen(false);
    // 상자가 테이블에 놓이고(0.5s) → 뚜껑이 열리고(1.3s) → 게임 시작
    window.setTimeout(() => setBoxOpen(true), 1300);
    window.setTimeout(() => setPhase('play'), 2400);
  };

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
        <div className={styles.lang} role="group" aria-label="Language">
          {(['en', 'ko'] as const).map((l) => (
            <button key={l} type="button" className={lang === l ? styles.langOn : ''} onClick={() => setLang(l)} aria-pressed={lang === l} disabled={phase === 'play' && game === 'relay'}>
              {l === 'en' ? 'EN' : '한'}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {phase === 'shelf' && (
          <motion.div key="shelf" className={styles.shelfWrap} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <p className={styles.lead}>{lang === 'ko' ? '같이 하나를 완성하는 작은 게임들' : 'Little games you finish together'}</p>
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
                      setHint(lang === 'ko' ? 'Cloud Match는 곧 열려요' : 'Cloud Match is coming soon');
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
                  {b.soon && <span className={styles.soon}>🔒 Coming soon</span>}
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
            <p className={styles.gatherText}>{boxOpen ? (lang === 'ko' ? '시작해 볼까요?' : 'Let’s play!') : lang === 'ko' ? 'Luna와 Hieu가 테이블로 왔어요' : 'Luna and Hieu join your table'}</p>
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
                  <h2>{result >= 3 ? (lang === 'ko' ? '구름 3개 완성!' : 'All 3 clouds!') : lang === 'ko' ? '카페가 문을 닫아요 ☕' : 'Café is closing ☕'}</h2>
                  <p>{lang === 'ko' ? `함께 구름 ${result}개를 만들었어요!` : `We made ${result} cloud${result === 1 ? '' : 's'} together!`}</p>
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
                  <h2>{lang === 'ko' ? '멋진 이어가기! ☁️' : 'Nice chain! ☁️'}</h2>
                  <p>{lang === 'ko' ? `함께 단어 ${result}개를 이었어요` : `${result} words together`}</p>
                </>
              )}
              <div className={styles.resultBtns}>
                <button type="button" onClick={() => setPhase('shelf')}>
                  {lang === 'ko' ? '다른 게임' : 'Another game'}
                </button>
                <button type="button" className={styles.primary} onClick={onClose}>
                  {lang === 'ko' ? '테이블로 돌아가기' : 'Back to the table'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
