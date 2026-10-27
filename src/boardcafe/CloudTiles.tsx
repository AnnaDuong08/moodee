// Cloud Tiles(협동): 카페가 문 닫기 전(12바퀴)까지 셋이 함께 구름 3개 완성
// 차례: YOU → Luna → Hieu. 조건에 맞는 빈 슬롯에 타일 1장, 또는 Pass(1장 뽑기). 틀려도 벌칙 없음
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { CharacterSprite } from '../components/CharacterSprite';
import type { Character } from '../data/characters';
import { DrinkGlass } from '../world/DrinkGlass';
import { chooseMove, say, type Lang } from './npc';
import { canPlace, COLOR_HEX, isComplete, lockedColor, makeDeck, nextPattern, shuffle, validSlots, type Pattern, type Tile } from './rules';
import styles from './boardcafe.module.css';

const base = import.meta.env.BASE_URL;
const A = (f: string) => `${base}assets/boardcafe/${f}`;
export const tileImg = (t: Tile) => A(`tile-${t.color}-${t.n}.png`);

type Who = 'you' | 'luna' | 'hieu';
const ORDER: Who[] = ['you', 'luna', 'hieu'];
const ROUNDS = 12;
const GOAL = 3;
const HAND = 5;
const HAND_MAX = 7;

interface Game {
  deck: Tile[];
  hands: Record<Who, Tile[]>;
  pattern: Pattern;
  filled: (Tile | null)[];
  round: number;
  turn: number; // ORDER 인덱스
  clouds: number;
  passStreak: number;
}

function newGame(): Game {
  const deck = shuffle(makeDeck());
  const hands = { you: deck.splice(0, HAND), luna: deck.splice(0, HAND), hieu: deck.splice(0, HAND) };
  const pattern = nextPattern(null);
  return { deck, hands, pattern, filled: pattern.slots.map(() => null), round: 1, turn: 0, clouds: 0, passStreak: 0 };
}

type Reaction = 'idle' | 'waiting' | 'nice' | 'celebrate';

interface Props {
  me: Character;
  luna: Character;
  hieu: Character;
  drink: string[] | null; // 테이블 위 음료(층)
  lang: Lang;
  onFinish: (clouds: number) => void;
}

export function CloudTiles({ me, luna, hieu, drink, lang, onFinish }: Props) {
  const [g, setG] = useState<Game>(newGame);
  const [busy, setBusy] = useState(false); // 완성 연출·NPC 생각 중에는 입력을 막는다
  const [thinking, setThinking] = useState<Who | null>(null);
  const [speech, setSpeech] = useState<Partial<Record<Who, string>>>({});
  const [reaction, setReaction] = useState<Reaction>('idle');
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ tile: Tile; x: number; y: number; sx: number; sy: number; moved: boolean } | null>(null);
  const [bounce, setBounce] = useState<string | null>(null); // 손패로 돌아오는 타일
  const [justPlaced, setJustPlaced] = useState<number | null>(null);
  const [cloudPop, setCloudPop] = useState(false);
  const [finale, setFinale] = useState(false);
  const board = useRef<HTMLDivElement>(null);
  const gRef = useRef(g);
  gRef.current = g;

  const current = ORDER[g.turn];
  const myTurn = current === 'you' && !busy && !finale;

  const talk = (who: Who, text: string) => {
    setSpeech((s) => ({ ...s, [who]: text }));
    window.setTimeout(() => setSpeech((s) => (s[who] === text ? { ...s, [who]: undefined } : s)), 1800);
  };

  // 차례 넘기기: 한 바퀴가 돌면 라운드 +1, 12바퀴가 끝나면 종료
  const advance = (next: Game): Game => {
    const turn = (next.turn + 1) % ORDER.length;
    const round = turn === 0 ? next.round + 1 : next.round;
    return { ...next, turn, round };
  };

  useEffect(() => {
    if (g.round > ROUNDS && !finale) window.setTimeout(() => onFinish(g.clouds), 600);
  }, [g.round, g.clouds, finale, onFinish]);

  // 타일 놓기(모든 플레이어 공통)
  const place = (who: Who, tile: Tile, slot: number) => {
    const cur = gRef.current;
    const filled = [...cur.filled];
    filled[slot] = tile;
    const hands = { ...cur.hands, [who]: cur.hands[who].filter((t) => t.id !== tile.id) };
    setJustPlaced(slot);
    window.setTimeout(() => setJustPlaced(null), 500);
    if (who === 'you') {
      setReaction('nice');
      window.setTimeout(() => setReaction((r) => (r === 'nice' ? 'idle' : r)), 1000);
    } else talk(who, say('place', lang));

    if (!isComplete(filled)) {
      setG(advance({ ...cur, filled, hands, passStreak: 0 }));
      return;
    }
    // 구름 완성: 잠깐 보여 준 뒤 새 패턴(같은 패턴 연속 금지)
    const clouds = cur.clouds + 1;
    setG({ ...cur, filled, hands, clouds, passStreak: 0 });
    setBusy(true);
    setCloudPop(true);
    setReaction('celebrate');
    talk(who === 'you' ? 'luna' : who, say('complete', lang));
    window.setTimeout(() => {
      setCloudPop(false);
      if (clouds >= GOAL) {
        setFinale(true);
        window.setTimeout(() => onFinish(clouds), 2600);
        return;
      }
      const pattern = nextPattern(cur.pattern.id);
      setG((prev) => advance({ ...prev, pattern, filled: pattern.slots.map(() => null) }));
      setReaction('idle');
      setBusy(false);
    }, 1500);
  };

  // Pass: 1장 뽑기. 셋 모두 연속 Pass면 패턴 교체(턴 소모 없음)
  const pass = (who: Who) => {
    const cur = gRef.current;
    const deck = [...cur.deck];
    const hands = { ...cur.hands };
    if (deck.length && hands[who].length < HAND_MAX) hands[who] = [...hands[who], deck.shift()!];
    const passStreak = cur.passStreak + 1;
    if (who !== 'you') talk(who, say('pass', lang));
    if (passStreak >= ORDER.length) {
      // 놓였던 타일은 더미 맨 아래로
      const back = cur.filled.filter((t): t is Tile => !!t);
      const pattern = nextPattern(cur.pattern.id);
      talk('hieu', say('swap', lang));
      setG({ ...cur, deck: [...deck, ...back], hands, pattern, filled: pattern.slots.map(() => null), passStreak: 0, turn: (cur.turn + 1) % ORDER.length });
      return;
    }
    setG(advance({ ...cur, deck, hands, passStreak }));
  };

  // NPC 차례: 0.8~1.4초 생각 후 둔다
  useEffect(() => {
    if (current === 'you' || busy || finale || g.round > ROUNDS) return;
    setThinking(current);
    setReaction('waiting');
    const id = window.setTimeout(() => {
      setThinking(null);
      const cur = gRef.current;
      const move = chooseMove(cur.pattern, cur.filled, cur.hands[current]);
      if (move) place(current, move.tile, move.slot);
      else pass(current);
    }, 800 + Math.random() * 600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.turn, g.round, busy, finale]);

  // 내 차례가 오면 가끔 격려 한마디
  useEffect(() => {
    if (current !== 'you' || busy) return;
    setReaction((r) => (r === 'waiting' ? 'idle' : r));
    if (g.round > 1 && Math.random() < 0.35) talk(Math.random() < 0.5 ? 'luna' : 'hieu', say('yourTurn', lang));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.turn]);

  // 내 타일을 슬롯에: 맞으면 놓고, 아니면 손패로 부드럽게 돌아감
  const tryPlace = (tile: Tile, slot: number | null) => {
    setSelected(null);
    if (slot !== null && canPlace(g.pattern, g.filled, slot, tile)) {
      place('you', tile, slot);
      return;
    }
    setBounce(tile.id);
    window.setTimeout(() => setBounce(null), 450);
    talk('you', lang === 'ko' ? '음, 여기는 아닌가 봐' : 'Hmm, not this one');
  };

  const slotAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-slot]');
    return el ? Number(el.dataset.slot) : null;
  };

  const onTileDown = (e: RPointerEvent, tile: Tile) => {
    if (!myTurn) return;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* 캡처를 못 해도 드래그는 컨테이너에서 계속 받는다 */
    }
    setDrag({ tile, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false });
  };
  const onTileMove = (e: RPointerEvent) => {
    if (!drag) return;
    const moved = drag.moved || Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 8;
    setDrag({ ...drag, x: e.clientX, y: e.clientY, moved });
  };
  const onTileUp = (e: RPointerEvent) => {
    if (!drag) return;
    const d = drag;
    setDrag(null);
    if (d.moved) tryPlace(d.tile, slotAt(e.clientX, e.clientY));
    else setSelected((s) => (s === d.tile.id ? null : d.tile.id)); // 탭: 선택 → 슬롯 탭
  };

  const active = drag?.tile ?? g.hands.you.find((t) => t.id === selected) ?? null;
  const glow = active && myTurn ? validSlots(g.pattern, g.filled, active) : [];
  const locked = lockedColor(g.pattern, g.filled);
  const rect = board.current?.getBoundingClientRect();
  const seq = g.clouds >= GOAL ? 3 : g.clouds > 0 ? 2 : 1;

  const Seat = ({ who, c }: { who: Who; c: Character }) => (
    <div className={`${styles.seat} ${current === who ? styles.seatOn : ''}`}>
      <span className={styles.face}>
        <CharacterSprite character={c} pose="front" style={{ height: '250%', position: 'absolute', left: '50%', top: c.premium ? '-118%' : '-40%', translate: '-50% 0' }} />
      </span>
      <b>{who === 'luna' ? 'Luna' : 'Hieu'}</b>
      <small>{g.hands[who].length} tiles</small>
      <AnimatePresence>
        {thinking === who && (
          <motion.img key="think" className={styles.thinkIcon} src={A('reaction-waiting.png')} alt="" initial={{ scale: 0 }} animate={{ scale: 1, y: [0, -4, 0] }} exit={{ scale: 0 }} transition={{ y: { repeat: Infinity, duration: 1 } }} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {(speech[who] || thinking === who) && (
          <motion.span key={speech[who] ?? '…'} className={styles.bubble} initial={{ opacity: 0, y: -6, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
            {speech[who] ?? '…'}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className={styles.game} ref={board} onPointerMove={onTileMove} onPointerUp={onTileUp}>
      <div className={styles.seats}>
        <Seat who="luna" c={luna} />
        <Seat who="hieu" c={hieu} />
      </div>

      {/* 테이블 위 패턴 카드 + 슬롯 */}
      <div className={styles.tableTop} style={{ backgroundImage: `url(${base}assets/cafe/table-top.jpg)` }}>
        <AnimatePresence mode="popLayout">
          <motion.div key={`${g.pattern.id}-${g.clouds}`} className={styles.patternCard} initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ duration: 0.45, ease: 'easeOut' }}>
            <div className={styles.patternHead}>
              <img src={A(`pattern-${g.pattern.id}.png`)} alt="" />
              <div>
                <b>{g.pattern.name}</b>
                <small>{g.pattern.color === 'same' ? (lang === 'ko' ? '같은 색' : 'Same color') : g.pattern.color === 'diff' ? (lang === 'ko' ? '모두 다른 색' : 'All different colors') : lang === 'ko' ? '색 상관없음' : 'Any color'}</small>
              </div>
            </div>
            <div className={styles.slots}>
              {g.pattern.slots.map((need, i) => {
                const t = g.filled[i];
                const can = glow.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    data-slot={i}
                    className={`${styles.slot} ${can ? styles.slotGlow : ''}`}
                    style={locked ? { borderColor: COLOR_HEX[locked] } : undefined}
                    onClick={() => active && myTurn && !drag && tryPlace(active, i)}
                    aria-label={t ? `Slot ${i + 1}: ${t.color} ${t.n}` : `Slot ${i + 1}${need ? `, needs ${need}` : ''}`}
                  >
                    {t ? (
                      <motion.img src={tileImg(t)} alt="" initial={justPlaced === i ? { scale: 1.5, y: -30, opacity: 0 } : false} animate={{ scale: 1, y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 16 }} />
                    ) : (
                      <span className={styles.need}>{need ?? '?'}</span>
                    )}
                  </button>
                );
              })}
            </div>
            <AnimatePresence>
              {cloudPop && (
                <motion.div className={styles.cloudPop} initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0, y: -30 }} transition={{ type: 'spring', stiffness: 300, damping: 14 }}>
                  <img src={A('reaction-celebrate.png')} alt="" />
                  <b>{lang === 'ko' ? '구름 완성!' : 'Cloud made!'}</b>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
        {drink && (
          <div className={styles.drink}>
            <DrinkGlass layers={drink} still />
          </div>
        )}
      </div>

      {/* 진행도 */}
      <div className={styles.progress}>
        <div className={styles.cloudsRow} aria-label={`${g.clouds} of ${GOAL} clouds`}>
          {Array.from({ length: GOAL }, (_, i) => (
            <motion.span key={i} className={`${styles.cloudDot} ${i < g.clouds ? styles.cloudOn : ''}`} animate={i === g.clouds - 1 ? { scale: [1, 1.4, 1] } : {}} transition={{ duration: 0.5 }}>
              ☁
            </motion.span>
          ))}
          <b>
            {g.clouds} / {GOAL} {lang === 'ko' ? '구름' : 'Clouds'}
          </b>
          <img className={styles.seq} src={A(`seq-${seq}.png`)} alt="" />
        </div>
        <span className={styles.turn}>
          {lang === 'ko' ? '차례' : 'Turn'} {Math.min(g.round, ROUNDS)} / {ROUNDS}
        </span>
      </div>

      {/* 내 타일 */}
      <div className={styles.handArea}>
        <div className={styles.handHead}>
          <span>{lang === 'ko' ? '내 타일' : 'YOUR TILES'}</span>
          <em>{myTurn ? (lang === 'ko' ? '네 차례! 끌거나 탭해서 놓기' : 'Your turn — drag or tap a tile') : thinking ? `${thinking === 'luna' ? 'Luna' : 'Hieu'} is thinking…` : ''}</em>
        </div>
        <div className={styles.hand}>
          {g.hands.you.map((t) => (
            <motion.button
              key={t.id}
              type="button"
              className={`${styles.handTile} ${selected === t.id ? styles.handSel : ''} ${drag?.tile.id === t.id && drag.moved ? styles.handGhost : ''}`}
              onPointerDown={(e) => onTileDown(e, t)}
              disabled={!myTurn}
              aria-label={`${t.color} ${t.n}`}
              layout
              initial={{ scale: 0, y: 20 }}
              animate={bounce === t.id ? { x: [0, -8, 8, -4, 0], scale: 1, y: 0 } : { scale: 1, y: selected === t.id ? -10 : 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            >
              <img src={tileImg(t)} alt="" draggable={false} />
            </motion.button>
          ))}
          <button type="button" className={styles.passBtn} onClick={() => myTurn && pass('you')} disabled={!myTurn}>
            {lang === 'ko' ? '패스' : 'Pass'}
            <small>{lang === 'ko' ? '+1장' : '+1 tile'}</small>
          </button>
        </div>
      </div>

      {/* Cloudee(나) 리액션 + 말풍선 */}
      <div className={styles.me}>
        <AnimatePresence mode="popLayout">
          <motion.img key={reaction} src={A(`reaction-${reaction}.png`)} alt={`Cloudee ${reaction}`} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1, y: reaction === 'celebrate' ? [0, -14, 0] : 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} />
        </AnimatePresence>
        <AnimatePresence>
          {speech.you && (
            <motion.span key={speech.you} className={`${styles.bubble} ${styles.bubbleMe}`} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              {speech.you}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <span className={styles.meName}>{me.name}</span>

      {/* 끌고 있는 타일 */}
      {drag?.moved && rect && (
        <img className={styles.dragGhost} src={tileImg(drag.tile)} alt="" style={{ left: drag.x - rect.left, top: drag.y - rect.top }} />
      )}

      {/* 3/3 완성 배너 + 별 */}
      <AnimatePresence>
        {finale && (
          <motion.div className={styles.finale} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.img src={A('banner-completed.png')} alt="Cloud completed! 3/3" initial={{ scale: 0.3, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 12 }} />
            {Array.from({ length: 14 }, (_, i) => (
              <motion.i
                key={i}
                className={styles.star}
                initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                animate={{ x: Math.cos((i / 14) * Math.PI * 2) * (120 + (i % 3) * 30), y: Math.sin((i / 14) * Math.PI * 2) * (120 + (i % 3) * 30), scale: [0, 1.2, 0.6], opacity: [1, 1, 0] }}
                transition={{ duration: 1.2, delay: 0.2 + (i % 4) * 0.05 }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
