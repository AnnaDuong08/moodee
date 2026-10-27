// Shop: 이벤트 배너(가로 일러스트 넘기기) · 출석 도장판 · 그림 중심 진열대 · Pro
// 글자는 이름과 가격뿐. 집중 기능은 유료 벽 뒤에 두지 않는다(Pro는 보상과 꾸미기만 늘림). 결제는 없는 데모
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { CharacterSprite } from '../components/CharacterSprite';
import { CoinChip, CountUp, Sparkles, UnlockModal } from '../components/Coin';
import { BackIcon, CoinIcon, FlameIcon, LockIcon } from '../components/Icons';
import { CLOUDEE_PRICE, DEMO_TOPUP, MONTHLY_REWARDS, STAMP_REWARDS, WARDROBE } from '../config/economy';
import { CHARACTERS } from '../data/characters';
import { screenMotion } from '../lib/motion';
import { monthStudyDays } from '../lib/sessions';
import { readStreak } from '../lib/streak';
import { claimReward, claimStamp, demoTopUp, hasCloudee, markStampReady, ownsPart, setPlan, stampedToday, stampPending, unlockCloudee, unlockPart, useWallet } from '../lib/wallet';
import styles from './ShopScreen.module.css';

const base = import.meta.env.BASE_URL;
const coinsImg = `${base}assets/rewards/coins.png`;
const stampImg = `${base}assets/characters/cloudy-three-quarter.png`;

// 이벤트 배너: 그림이 주인공, 글자는 짧은 제목 하나
const BANNERS = [
  { art: 'autumn', title: 'Autumn Days' },
  { art: 'cherry-blossom', title: 'Blossom Season' },
  { art: 'beach', title: 'Beach Week' },
  { art: 'birthday', title: 'Party Time' },
  { art: 'cafe-barista', title: 'Café Night' },
  { art: 'chuseok-moon', title: 'Moon Festival' },
  { art: 'hanbok-spring', title: 'Hanbok Spring' },
  { art: 'painter', title: 'Art Club' },
  { art: 'airport-travel', title: 'Take a Trip' },
  { art: 'tennis', title: 'Sports Day' },
  { art: 'graduation', title: 'Graduation' },
  { art: 'bunny-hood', title: 'Bunny Hood' },
  { art: 'cat-hood', title: 'Cat Hood' },
  { art: 'angel-devil', title: 'Angels & Devils' },
  { art: 'friends', title: 'Friends Week' },
];

const Check = () => (
  <svg className={styles.check} viewBox="0 0 24 24" aria-hidden>
    <path d="M5 12.500l4.500 4.500L19 7.500" fill="none" stroke="currentColor" strokeWidth="3.500" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type Pending = { kind: 'part'; id: string; img: string; noun: string; price: number } | { kind: 'cloudee'; id: (typeof CHARACTERS)[number]['id'] };

export function ShopScreen({ onBack, onStudy }: { onBack: () => void; onStudy: () => void }) {
  const wallet = useWallet();
  const days = monthStudyDays();
  const streak = readStreak();
  const pro = wallet.plan === 'pro';
  const [toast, setToast] = useState<string | null>(null);
  const [burst, setBurst] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  const say = (t: string, key?: string) => {
    setToast(t);
    if (key) {
      setBurst(key);
      window.setTimeout(() => setBurst(null), 1100);
    }
    window.setTimeout(() => setToast(null), 2200);
  };

  // ── 이벤트 배너: 들어올 때마다 무작위 시작(같은 그림이 또 나올 수도 있다), 자동으로 넘어가고 끌어서도 넘긴다 ──
  const [slide, setSlide] = useState(() => Math.floor(Math.random() * BANNERS.length));
  const [dragging, setDragging] = useState(false);
  const go = (n: number) => setSlide((n + BANNERS.length) % BANNERS.length);
  const slideRef = useRef(slide);
  slideRef.current = slide;
  useEffect(() => {
    if (dragging) return;
    const id = window.setInterval(() => go(slideRef.current + 1), 4200);
    return () => clearInterval(id);
  }, [dragging, slide]);
  const onDragEnd = (_: unknown, info: PanInfo) => {
    setDragging(false);
    if (info.offset.x < -40 || info.velocity.x < -300) go(slide + 1);
    else if (info.offset.x > 40 || info.velocity.x > 300) go(slide - 1);
  };
  const dots = [-2, -1, 0, 1, 2].map((o) => (slide + o + BANNERS.length) % BANNERS.length);

  // ── 출석 도장판 ──
  const rewards = STAMP_REWARDS[pro ? 'pro' : 'free'];
  const ready = stampPending(wallet);
  const cycleDone = wallet.stampCount >= rewards.length && !ready;
  const next = Math.min(wallet.stampCount, rewards.length - 1);
  const claimToday = () => {
    const gain = claimStamp();
    if (gain) say(`+${gain} coins`, `stamp-${next}`);
  };

  const buyPart = () => pending?.kind === 'part' && unlockPart(pending.id);

  return (
    <motion.main className={`screen ${styles.shop}`} {...screenMotion}>
      <header className={styles.top}>
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Back">
          <BackIcon />
        </button>
        <img className={styles.logo} src={`${base}assets/brand/logo.png`} alt="MOODEE" />
        <div className={styles.chips}>
          <CoinChip />
          <span className={styles.chip}>
            <FlameIcon width={16} height={16} className={styles.flame} /> <b>{streak.count}</b>
          </span>
        </div>
      </header>

      <div className={styles.scroll}>
        {/* 이벤트 배너 */}
        <section className={styles.banner} aria-roledescription="carousel" aria-label="Events">
          <motion.div className={styles.strip} drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.25} onDragStart={() => setDragging(true)} onDragEnd={onDragEnd} animate={{ x: 0 }}>
            <AnimatePresence initial={false} mode="popLayout">
              <motion.figure key={slide} className={styles.slide} initial={{ opacity: 0, x: 40, scale: 1.04 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.5, ease: 'easeOut' }}>
                <img src={`${base}assets/splash-wide/${BANNERS[slide].art}.jpg`} alt="" draggable={false} />
                <figcaption>
                  <span>EVENT</span>
                  {BANNERS[slide].title}
                </figcaption>
              </motion.figure>
            </AnimatePresence>
          </motion.div>
          <button type="button" className={`${styles.arrow} ${styles.prev}`} onClick={() => go(slide - 1)} aria-label="Previous event">
            ‹
          </button>
          <button type="button" className={`${styles.arrow} ${styles.nextBtn}`} onClick={() => go(slide + 1)} aria-label="Next event">
            ›
          </button>
          <div className={styles.dots} aria-hidden>
            {dots.map((_, i) => (
              <i key={i} className={i === 2 ? styles.dotOn : ''} />
            ))}
          </div>
        </section>

        {/* 출석 도장판 */}
        <section className={styles.stamps} aria-label="Attendance">
          <div className={styles.stampHead}>
            <h2>Attendance</h2>
            <span>
              {Math.min(wallet.stampCount, rewards.length)} / {rewards.length}
            </span>
          </div>
          <ul className={styles.board}>
            {rewards.map((coins, i) => {
              const done = i < wallet.stampCount;
              const today = i === next && !cycleDone;
              const big = i === rewards.length - 1;
              return (
                <li key={i} className={`${styles.tile} ${big ? styles.big : ''} ${done ? styles.done : ''} ${today && ready ? styles.today : ''} ${today && !ready && !done ? styles.upcoming : ''}`}>
                  <small>Day {i + 1}</small>
                  <img src={coinsImg} alt="" className={big ? styles.chest : ''} />
                  <b>×{coins}</b>
                  {!pro && <em>Pro ×{STAMP_REWARDS.pro[i]}</em>}
                  {done && (
                    <motion.img
                      className={styles.stamp}
                      src={stampImg}
                      alt="Stamped"
                      initial={burst === `stamp-${i}` ? { scale: 2.6, rotate: -25, opacity: 0 } : false}
                      animate={{ scale: 1, rotate: -10, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 15 }}
                    />
                  )}
                  {burst === `stamp-${i}` && <Sparkles count={12} />}
                </li>
              );
            })}
          </ul>
          {ready ? (
            <motion.button type="button" className={styles.claim} onClick={claimToday} animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 1.3, repeat: Infinity }}>
              <CoinIcon /> Claim today’s stamp
            </motion.button>
          ) : (
            <p className={styles.stampNote}>
              {cycleDone ? 'Board complete! A fresh one starts with your next session.' : stampedToday(wallet) ? 'Stamped for today. See you tomorrow.' : 'Finish a session today to light up the next stamp.'}
            </p>
          )}
          {!ready && !stampedToday(wallet) && !cycleDone && (
            <button type="button" className={styles.link} onClick={onStudy}>
              Start studying
            </button>
          )}
        </section>

        {/* 진열대 */}
        <Shelf title="Cloudees">
          {CHARACTERS.map((c) => {
            const owned = hasCloudee(wallet, c);
            return (
              <button
                key={c.id}
                type="button"
                className={`${styles.card} ${c.premium ? styles.cardPro : ''}`}
                onClick={() => (owned ? say(`${c.name} is yours`) : c.premium ? say('Available with MOODEE PRO') : setPending({ kind: 'cloudee', id: c.id }))}
                aria-label={owned ? `${c.name}, owned` : c.premium ? `${c.name}, MOODEE PRO` : `${c.name}, ${CLOUDEE_PRICE} coins`}
              >
                <span className={styles.pic}>
                  <CharacterSprite character={c} pose="front" className={`${styles.face} ${!owned ? styles.faceLocked : ''}`} style={c.premium ? { height: '190%', top: '-70%' } : { height: '220%' }} />
                </span>
                <b>{c.name}</b>
                <span className={styles.price}>{owned ? <Check /> : c.premium ? <>PRO</> : <><CoinIcon width={14} height={14} /> {CLOUDEE_PRICE}</>}</span>
                {!owned && <LockIcon className={styles.lock} />}
              </button>
            );
          })}
        </Shelf>

        <Shelf title="Outfits">
          {WARDROBE.flatMap((t) => t.items.slice(0, 4).map((it) => ({ it, t }))).map(({ it, t }) => {
            const owned = ownsPart(wallet, it.id);
            return (
              <button
                key={it.id}
                type="button"
                className={styles.card}
                onClick={() => (owned ? say('Already in your wardrobe') : setPending({ kind: 'part', id: it.id, img: it.img, noun: t.noun, price: it.price }))}
                aria-label={owned ? `${t.noun}, owned` : `${t.noun}, ${it.price} coins`}
              >
                <span className={styles.pic}>
                  <img src={it.img} alt="" className={owned ? '' : styles.dim} loading="lazy" />
                </span>
                <b>{t.label}</b>
                <span className={styles.price}>{owned ? <Check /> : <><CoinIcon width={14} height={14} /> {it.price}</>}</span>
                {!owned && <LockIcon className={styles.lock} />}
              </button>
            );
          })}
        </Shelf>

        <Shelf title="This month" sub={`Day ${Math.min(days, 30)} / 30`}>
          {MONTHLY_REWARDS.map((r) => {
            const owned = wallet.rewards.includes(r.id);
            const reached = days >= r.day;
            const canClaim = pro && reached && !owned;
            return (
              <button
                key={r.id}
                type="button"
                className={`${styles.card} ${styles.cardPro} ${canClaim ? styles.claimable : ''}`}
                onClick={() => (canClaim ? (claimReward(r.id, days), say(`${r.name} added`, r.id)) : owned ? say('Already in your wardrobe') : say(pro ? `Unlocks on day ${r.day}` : 'Monthly items come with Pro'))}
                aria-label={owned ? `${r.name}, owned` : canClaim ? `Claim ${r.name}` : `${r.name}, day ${r.day}, Pro`}
              >
                <span className={styles.pic}>
                  <img src={r.img} alt="" className={owned || canClaim ? '' : styles.dim} />
                </span>
                <b>{r.name.split(' ').slice(-1)[0]}</b>
                <span className={styles.price}>{owned ? <Check /> : canClaim ? 'Claim' : `Day ${r.day}`}</span>
                {!owned && !canClaim && <LockIcon className={styles.lock} />}
                {burst === r.id && <Sparkles count={12} />}
              </button>
            );
          })}
        </Shelf>

        {/* 시연용: 공부 없이 흐름을 볼 수 있게 */}
        <div className={styles.demo}>
          <button type="button" onClick={() => (demoTopUp(), say(`+${DEMO_TOPUP} demo coins`))}>
            <CoinIcon /> +{DEMO_TOPUP} coins
          </button>
          <button type="button" onClick={() => (markStampReady() ? say('Stamp ready (demo)') : say('Stamp already used today'))}>
            ★ Demo: study day
          </button>
        </div>
      </div>

      <div className={styles.dock}>
        <motion.button
          type="button"
          className={`pill ${styles.cta} ${pro ? styles.ctaOn : ''}`}
          onClick={() => (setPlan(pro ? 'free' : 'pro'), say(pro ? 'Back on Free. Your coins and items stay.' : 'MOODEE Pro — bigger stamps, monthly outfits', 'plan'))}
          whileTap={{ scale: 0.97 }}
        >
          {pro ? (
            <>
              <Check /> Pro activated
            </>
          ) : (
            <>
              <LockIcon width={18} height={18} /> Upgrade to Pro
            </>
          )}
          {burst === 'plan' && <Sparkles count={12} />}
        </motion.button>
        <p>Demo only — no payment is taken.</p>
      </div>

      <UnlockModal
        open={!!pending}
        title={pending?.kind === 'cloudee' ? 'Unlock this Cloudee?' : pending ? `Unlock this ${pending.noun}?` : ''}
        price={pending?.kind === 'cloudee' ? CLOUDEE_PRICE : (pending?.price ?? 0)}
        preview={
          pending?.kind === 'part' ? (
            <img src={pending.img} alt="" />
          ) : pending ? (
            <div className={styles.modalFace}>
              <CharacterSprite character={CHARACTERS.find((c) => c.id === pending.id)!} pose="front" style={{ height: '220%', position: 'absolute', left: '50%', top: '-38%', translate: '-50% 0' }} />
            </div>
          ) : null
        }
        onCancel={() => setPending(null)}
        onConfirm={() => (pending?.kind === 'cloudee' ? unlockCloudee(pending.id) : buyPart())}
      />

      <AnimatePresence>
        {toast && (
          <motion.p className={styles.toast} role="status" initial={{ opacity: 0, y: 14, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 8, x: '-50%' }}>
            {toast === `+${STAMP_REWARDS[pro ? 'pro' : 'free'][Math.max(0, wallet.stampCount - 1)]} coins` ? (
              <>
                <CoinIcon /> <CountUp value={STAMP_REWARDS[pro ? 'pro' : 'free'][Math.max(0, wallet.stampCount - 1)]} /> coins
              </>
            ) : (
              toast
            )}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.main>
  );
}

function Shelf({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className={styles.shelf}>
      <div className={styles.shelfHead}>
        <h2>{title}</h2>
        {sub && <span>{sub}</span>}
      </div>
      <div className={styles.row}>{children}</div>
    </section>
  );
}
