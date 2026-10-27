// Word Relay(끝말잇기 / Last-letter chain): Luna → YOU → Hieu 순서로 이어 간다. 90초 뒤 끝, 승패 없음
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { candidates, isValidNext, lastChar, pickRandom, WORDS, type RelayLang } from './wordPool';
import styles from './boardcafe.module.css';

const base = import.meta.env.BASE_URL;
type Who = 'luna' | 'you' | 'hieu';
const ORDER: Who[] = ['luna', 'you', 'hieu'];
const NAME: Record<Who, string> = { luna: 'Luna', you: 'You', hieu: 'Hieu' };
const SECONDS = 90;

interface Link {
  who: Who;
  word: string;
  fresh?: boolean; // 새로 시작한 단어
}

export function WordRelay({ lang, onFinish }: { lang: RelayLang; onFinish: (words: number) => void }) {
  const [chain, setChain] = useState<Link[]>([]);
  const [turn, setTurn] = useState(0);
  const [left, setLeft] = useState(SECONDS);
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const list = useRef<HTMLOListElement>(null);
  const chainRef = useRef(chain);
  chainRef.current = chain;
  const done = left <= 0;
  const who = ORDER[turn % 3];
  const prev = chain.length ? chain[chain.length - 1].word : null;
  const used = chain.map((c) => c.word);

  // 부드러운 타이머(빨간 경고 없음)
  useEffect(() => {
    if (done) {
      const id = window.setTimeout(() => onFinish(chainRef.current.length), 900);
      return () => clearTimeout(id);
    }
    const id = window.setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [done, onFinish]);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' });
  }, [chain.length]);

  const push = (link: Link) => {
    setChain((c) => [...c, link]);
    setTurn((t) => t + 1);
  };

  // NPC 차례: 이어갈 단어가 없으면 "새로 시작!"
  useEffect(() => {
    if (done || who === 'you') return;
    const id = window.setTimeout(
      () => {
        const c = chainRef.current;
        const p = c.length ? c[c.length - 1].word : null;
        const u = c.map((x) => x.word);
        const opts = candidates(lang, p, u);
        if (opts.length) push({ who, word: pickRandom(opts) });
        else {
          setNote(lang === 'ko' ? `${NAME[who]}: 새로 시작하자!` : `${NAME[who]}: Let’s start fresh!`);
          window.setTimeout(() => setNote(null), 1800);
          push({ who, word: pickRandom(candidates(lang, null, u)), fresh: true });
        }
      },
      1000 + Math.random() * 700,
    );
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, done]);

  // 내 차례: 맞는 후보 3개
  useEffect(() => {
    if (who !== 'you') return;
    const opts = candidates(lang, prev, used);
    setOptions([...opts].sort(() => Math.random() - 0.5).slice(0, 3));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn]);

  const submit = (w: string) => {
    if (who !== 'you' || done) return;
    const word = w.trim().toLowerCase();
    if (!isValidNext(lang, prev, used, word)) {
      setNote(
        used.includes(word)
          ? lang === 'ko' ? '이미 나온 단어야' : 'Already used'
          : prev && word[0] !== lastChar(prev)
            ? lang === 'ko' ? `‘${lastChar(prev)}’(으)로 시작해 볼까?` : `Try a word starting with “${lastChar(prev)}”`
            : lang === 'ko' ? '카페 단어장에 없는 말이야' : 'Not in our café word list',
      );
      window.setTimeout(() => setNote(null), 1800);
      return;
    }
    setDraft('');
    push({ who: 'you', word });
  };

  return (
    <div className={styles.relay}>
      <div className={styles.relayHead}>
        <img src={`${base}assets/boardcafe/wordrelay-arrow.png`} alt="" />
        <div>
          <b>{lang === 'ko' ? '끝말잇기' : 'Word Relay'}</b>
          <small>
            {chain.length} {lang === 'ko' ? '단어 이어짐' : 'words together'}
          </small>
        </div>
      </div>
      <div className={styles.timeBar} aria-label={`${Math.max(0, left)} seconds left`}>
        <span style={{ width: `${(Math.max(0, left) / SECONDS) * 100}%` }} />
      </div>

      <ol className={styles.chain} ref={list}>
        <AnimatePresence initial={false}>
          {chain.map((c, i) => (
            <motion.li key={i} className={`${styles.link} ${styles[`link_${c.who}`]}`} initial={{ opacity: 0, x: c.who === 'you' ? 30 : -30, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 360, damping: 22 }}>
              <small>
                {NAME[c.who]}
                {c.fresh ? (lang === 'ko' ? ' · 새 시작' : ' · fresh start') : ''}
              </small>
              <span className={styles.arrowBar}>
                <b>{c.word}</b>
                <i aria-hidden>➜</i>
              </span>
              <span className={styles.lastCircle}>{lastChar(c.word)}</span>
            </motion.li>
          ))}
        </AnimatePresence>
        {!done && who !== 'you' && (
          <li className={styles.typing}>
            {NAME[who]} <span>•••</span>
          </li>
        )}
      </ol>

      <AnimatePresence>
        {note && (
          <motion.p className={styles.relayNote} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {note}
          </motion.p>
        )}
      </AnimatePresence>

      <div className={styles.relayInput}>
        {who === 'you' && !done ? (
          <>
            <div className={styles.options}>
              {options.length ? (
                options.map((o) => (
                  <motion.button key={o} type="button" onClick={() => submit(o)} whileTap={{ scale: 0.92 }}>
                    {o}
                  </motion.button>
                ))
              ) : (
                <button type="button" onClick={() => push({ who: 'you', word: pickRandom(candidates(lang, null, used)), fresh: true })}>
                  {lang === 'ko' ? '새로 시작하기' : 'Start fresh'}
                </button>
              )}
            </div>
            <form
              className={styles.inputBar}
              onSubmit={(e) => {
                e.preventDefault();
                submit(draft);
              }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={prev ? (lang === 'ko' ? `‘${lastChar(prev)}’(으)로 시작하는 단어` : `A word starting with “${lastChar(prev)}”`) : lang === 'ko' ? '아무 단어나' : 'Any word'}
                aria-label="Your word"
                autoComplete="off"
              />
              <button type="submit" aria-label="Send">
                ›
              </button>
            </form>
          </>
        ) : (
          <p className={styles.waitNote}>{done ? (lang === 'ko' ? '시간이 다 됐어요 ☁️' : 'Time’s up ☁️') : `${NAME[who]}${lang === 'ko' ? '의 차례' : '’s turn'}`}</p>
        )}
      </div>
      <p className={styles.poolNote}>{lang === 'ko' ? `카페 단어장 ${WORDS.ko.length}개` : `${WORDS.en.length} café words`}</p>
    </div>
  );
}
