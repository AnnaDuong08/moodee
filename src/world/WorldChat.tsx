// World chat (Minecraft-style): "<name> message" lines stack at the bottom left of the screen and fade after a while
// Other Cloudees occasionally talk like real people, and when I speak someone answers (local demo without a server)
import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n';
import styles from './WorldChat.module.css';

export interface Chatter {
  place: string; // e.g. "the café"
  speakers: { id?: string; name: string }[]; // If there's an id, a speech bubble also appears above that NPC's head
  lines: string[]; // Talking to themselves / small talk
  replies: string[]; // Replies to what I say
}

interface Line {
  key: number;
  who?: string; // If absent, it's a system message (joined, etc.)
  text: string;
  at: number;
}

interface Props {
  chatter: Chatter;
  paused?: boolean;
  onSay: (npcId: string, text: string) => void;
}

const VISIBLE_MS = 9000;
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
let seq = 0;

export function WorldChat({ chatter, paused, onSay }: Props) {
  const t = useT();
  // System lines keep the English text and are translated when shown
  const [lines, setLines] = useState<Line[]>(() => [{ key: ++seq, text: 'You joined {place}', at: Date.now() }]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [, setNow] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const pausedRef = useRef(!!paused);
  pausedRef.current = !!paused;
  const lastLine = useRef('');

  const push = (who: string | undefined, text: string, id?: string) => {
    setLines((all) => [...all.slice(-30), { key: ++seq, who, text, at: Date.now() }]);
    if (id) onSay(id, text);
  };
  const pushRef = useRef(push);
  pushRef.current = push;

  // Other Cloudees' lines: someone says something every 6–15 s (never the same line twice in a row)
  useEffect(() => {
    if (!chatter.speakers.length) return;
    let timer = 0;
    const next = () => {
      timer = window.setTimeout(() => {
        if (!pausedRef.current) {
          const s = pick(chatter.speakers);
          let text = pick(chatter.lines);
          if (text === lastLine.current) text = pick(chatter.lines);
          lastLine.current = text;
          pushRef.current(s.name, text, s.id);
        }
        next();
      }, 6000 + Math.random() * 9000);
    };
    // Someone says hello right after you enter
    const hello = window.setTimeout(() => {
      const s = pick(chatter.speakers);
      pushRef.current(s.name, pick(['hi!', 'oh hey :)', 'welcome~', 'hello hello']), s.id);
    }, 1800);
    next();
    return () => {
      clearTimeout(timer);
      clearTimeout(hello);
    };
  }, [chatter]);

  // Re-render every second so old lines fade
  useEffect(() => {
    const id = window.setInterval(() => setNow((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Open chat with T or Enter (when not typing)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (pausedRef.current || (e.target instanceof HTMLElement && /INPUT|TEXTAREA/.test(e.target.tagName))) return;
      if (e.code === 'KeyT' || e.code === 'Enter') {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, []);
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  const send = () => {
    const text = draft.trim();
    setDraft('');
    setOpen(false);
    if (!text) return;
    push('You', text);
    // Someone replies after a moment (sometimes two people)
    if (!chatter.speakers.length) return;
    const first = pick(chatter.speakers);
    window.setTimeout(() => pushRef.current(first.name, pick(chatter.replies), first.id), 1200 + Math.random() * 1500);
    if (chatter.speakers.length > 1 && Math.random() < 0.4) {
      const second = pick(chatter.speakers.filter((s) => s !== first));
      window.setTimeout(() => pushRef.current(second.name, pick(chatter.replies), second.id), 3200 + Math.random() * 1500);
    }
  };

  if (paused) return null;
  const now = Date.now();
  const shown = open ? lines.slice(-8) : lines.filter((l) => now - l.at < VISIBLE_MS).slice(-5);

  return (
    <div className={styles.chat} onPointerDown={(e) => e.stopPropagation()}>
      <ul className={styles.log} aria-live="polite" aria-label={t('Chat')}>
        {shown.map((l) => (
          <li key={l.key} className={`${l.who ? '' : styles.system} ${l.who === 'You' ? styles.mine : ''} ${!open && now - l.at > VISIBLE_MS - 2000 ? styles.fading : ''}`}>
            {l.who ? (
              <>
                <b>&lt;{l.who === 'You' ? t('You') : l.who}&gt;</b> {l.who === 'You' ? l.text : t(l.text)}
              </>
            ) : (
              t(l.text, { place: t(chatter.place) })
            )}
          </li>
        ))}
      </ul>
      {open ? (
        <div className={styles.inputRow}>
          <input
            ref={input}
            value={draft}
            maxLength={70}
            placeholder={t('Say something…')}
            aria-label={t('Chat message')}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send();
              else if (e.key === 'Escape') setOpen(false);
            }}
            onBlur={() => !draft && setOpen(false)}
          />
          <button type="button" onPointerDown={(e) => e.preventDefault()} onClick={send} aria-label={t('Send')}>
            ›
          </button>
        </div>
      ) : (
        <button type="button" className={styles.toggle} onClick={() => setOpen(true)} aria-label={t('Open chat')}>
          <kbd>T</kbd> {t('Chat')}
        </button>
      )}
    </div>
  );
}
