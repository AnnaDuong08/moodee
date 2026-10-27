// Cloud Tiles (co-op): the three of you make 3 clouds together before the café closes (12 rounds)
// Turn order: YOU → Luna → Hieu. Place 1 tile in a matching empty slot, or Pass (draw 1). No penalty for mistakes
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { CharacterSprite } from '../components/CharacterSprite';
import type { Character } from '../data/characters';
import { DrinkGlass } from '../world/DrinkGlass';
import { t } from './i18n';
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
  turn: number; // ORDER index
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
  drink: string[] | null; // Drink on the table (layers)
  lang: Lang;
  onFinish: (clouds: number) => void;
}

export function CloudTiles({ me, luna, hieu, drink, lang, onFinish }: Props) {
  const [g, setG] = useState<Game>(newGame);
  const [busy, setBusy] = useState(false); // Block input during completion animations and while NPCs are thinking
  const [thinking, setThinking] = useState<Who | null>(null);
  const [speech, setSpeech] = useState<Partial<Record<Who, string>>>({});
  const [reaction, setReaction] = useState<Reaction>('idle');
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ tile: Tile; x: number; y: number; sx: number; sy: number; moved: boolean } | null>(null);
  const [bounce, setBounce] = useState<string | null>(null); // Tile returning to the hand
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

  // Advance turn: one full loop adds +1 round; ends after 12 rounds
  const advance = (next: Game): Game => {
    const turn = (next.turn + 1) % ORDER.length;
    const round = turn === 0 ? next.round + 1 : next.round;
    return { ...next, turn, round };
  };

  useEffect(() => {
    if (g.round > ROUNDS && !finale) window.setTimeout(() => onFinish(g.clouds), 600);
  }, [g.round, g.clouds, finale, onFinish]);

  // Place a tile (shared by all players)
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
    // Cloud complete: show it briefly, then a new pattern (no repeating the same pattern back to back)
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

  // Pass: draw 1. If all three pass in a row, swap the pattern (doesn't use a turn)
  const pass = (who: Who) => {
    const cur = gRef.current;
    const deck = [...cur.deck];
    const hands = { ...cur.hands };
    if (deck.length && hands[who].length < HAND_MAX) hands[who] = [...hands[who], deck.shift()!];
    const passStreak = cur.passStreak + 1;
    if (who !== 'you') talk(who, say('pass', lang));
    if (passStreak >= ORDER.length) {
      // Placed tiles go to the bottom of the pile
      const back = cur.filled.filter((t): t is Tile => !!t);
      const pattern = nextPattern(cur.pattern.id);
      talk('hieu', say('swap', lang));
      setG({ ...cur, deck: [...deck, ...back], hands, pattern, filled: pattern.slots.map(() => null), passStreak: 0, turn: (cur.turn + 1) % ORDER.length });
      return;
    }
    setG(advance({ ...cur, deck, hands, passStreak }));
  };

  // NPC turn: think for 0.8–1.4 s, then play
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

  // Occasionally a word of encouragement when it's my turn
  useEffect(() => {
    if (current !== 'you' || busy) return;
    setReaction((r) => (r === 'waiting' ? 'idle' : r));
    if (g.round > 1 && Math.random() < 0.35) talk(Math.random() < 0.5 ? 'luna' : 'hieu', say('yourTurn', lang));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.turn]);

  // My tile onto a slot: place it if it fits, otherwise it glides back to the hand
  const tryPlace = (tile: Tile, slot: number | null) => {
    setSelected(null);
    if (slot !== null && canPlace(g.pattern, g.filled, slot, tile)) {
      place('you', tile, slot);
      return;
    }
    setBounce(tile.id);
    window.setTimeout(() => setBounce(null), 450);
    talk('you', t(lang, 'notThisOne'));
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
      /* Even without pointer capture, the container keeps receiving the drag */
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
    else setSelected((s) => (s === d.tile.id ? null : d.tile.id)); // Tap: select → tap a slot
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

      {/* Pattern card + slots on the table */}
      <div className={styles.tableTop} style={{ backgroundImage: `url(${base}assets/cafe/table-top.jpg)` }}>
        <AnimatePresence mode="popLayout">
          <motion.div key={`${g.pattern.id}-${g.clouds}`} className={styles.patternCard} initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ duration: 0.45, ease: 'easeOut' }}>
            <div className={styles.patternHead}>
              <img src={A(`pattern-${g.pattern.id}.png`)} alt="" />
              <div>
                <b>{g.pattern.name}</b>
                <small>{t(lang, g.pattern.color === 'same' ? 'sameColor' : g.pattern.color === 'diff' ? 'diffColor' : 'anyColor')}</small>
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
                  <b>{t(lang, 'cloudMade')}</b>
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

      {/* Progress */}
      <div className={styles.progress}>
        <div className={styles.cloudsRow} aria-label={`${g.clouds} of ${GOAL} clouds`}>
          {Array.from({ length: GOAL }, (_, i) => (
            <motion.span key={i} className={`${styles.cloudDot} ${i < g.clouds ? styles.cloudOn : ''}`} animate={i === g.clouds - 1 ? { scale: [1, 1.4, 1] } : {}} transition={{ duration: 0.5 }}>
              ☁
            </motion.span>
          ))}
          <b>
            {g.clouds} / {GOAL} {t(lang, 'clouds')}
          </b>
          <img className={styles.seq} src={A(`seq-${seq}.png`)} alt="" />
        </div>
        <span className={styles.turn}>
          {t(lang, 'turn')} {Math.min(g.round, ROUNDS)} / {ROUNDS}
        </span>
      </div>

      {/* My tiles */}
      <div className={styles.handArea}>
        <div className={styles.handHead}>
          <span>{t(lang, 'yourTiles')}</span>
          <em>{myTurn ? t(lang, 'yourTurnHint') : thinking ? t(lang, 'thinking', { name: thinking === 'luna' ? 'Luna' : 'Hieu' }) : ''}</em>
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
            {t(lang, 'pass')}
            <small>{t(lang, 'plusTile')}</small>
          </button>
        </div>
      </div>

      {/* Cloudee (me) reaction + speech bubble */}
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

      {/* Tile being dragged */}
      {drag?.moved && rect && (
        <img className={styles.dragGhost} src={tileImg(drag.tile)} alt="" style={{ left: drag.x - rect.left, top: drag.y - rect.top }} />
      )}

      {/* 3/3 complete banner + stars */}
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
