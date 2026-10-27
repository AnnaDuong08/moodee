// 월드 채팅(마인크래프트식): 화면 왼쪽 아래에 "<이름> 말" 줄이 쌓였다가 잠시 뒤 흐려진다
// 다른 Cloudee들은 실제 사람처럼 가끔 말을 걸고, 내가 말하면 누군가 대답한다(서버 없는 로컬 데모)
import { useEffect, useRef, useState } from 'react';
import styles from './WorldChat.module.css';

export interface Chatter {
  place: string; // 예: "the café"
  speakers: { id?: string; name: string }[]; // id가 있으면 그 NPC 머리 위에 말풍선도 뜬다
  lines: string[]; // 혼잣말·잡담
  replies: string[]; // 내 말에 대한 대답
}

interface Line {
  key: number;
  who?: string; // 없으면 시스템 메시지(입장 등)
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
  const [lines, setLines] = useState<Line[]>(() => [{ key: ++seq, text: `You joined ${chatter.place}`, at: Date.now() }]);
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

  // 다른 Cloudee들의 말: 6~15초마다 누군가 한마디(같은 말이 연달아 나오지 않게)
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
    // 들어오자마자 한 명이 먼저 인사
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

  // 오래된 줄이 흐려지도록 1초마다 다시 그림
  useEffect(() => {
    const id = window.setInterval(() => setNow((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // T 또는 Enter로 채팅 열기(글을 쓰는 중이 아닐 때)
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
    // 누군가 조금 있다가 대답한다(가끔은 두 명)
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
      <ul className={styles.log} aria-live="polite" aria-label="Chat">
        {shown.map((l) => (
          <li key={l.key} className={`${l.who ? '' : styles.system} ${l.who === 'You' ? styles.mine : ''} ${!open && now - l.at > VISIBLE_MS - 2000 ? styles.fading : ''}`}>
            {l.who ? (
              <>
                <b>&lt;{l.who}&gt;</b> {l.text}
              </>
            ) : (
              l.text
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
            placeholder="Say something…"
            aria-label="Chat message"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send();
              else if (e.key === 'Escape') setOpen(false);
            }}
            onBlur={() => !draft && setOpen(false)}
          />
          <button type="button" onPointerDown={(e) => e.preventDefault()} onClick={send} aria-label="Send">
            ›
          </button>
        </div>
      ) : (
        <button type="button" className={styles.toggle} onClick={() => setOpen(true)} aria-label="Open chat">
          <kbd>T</kbd> Chat
        </button>
      )}
    </div>
  );
}
