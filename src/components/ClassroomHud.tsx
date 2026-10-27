// 교실 집중 화면 HUD: 미니맵(내 자리·친구 위치·인원) + 소리 아이콘(개별 ON/OFF) + 가벼운 데모 채팅
// 채팅은 이 세션 안에서만 남는 로컬 데모다(서버 없음). 조용한 공간이라 기본은 접혀 있다
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { SOUNDS, type SoundId } from '../audio/soundscape';
import { CLASSMATES } from '../data/classmates';
import { CLASSROOM, type Seat } from '../data/places';
import { PeopleIcon } from './Icons';
import styles from './ClassroomHud.module.css';

interface Props {
  seat: Seat;
  soundOn: (id: SoundId) => boolean;
  onToggleSound: (id: SoundId) => void;
  onMixer: () => void;
  raised: boolean; // 아래에 타이머 패널이 있을 때
  dimmed?: boolean; // 위에 노트 창이 떠 있을 때: 소리 버튼·채팅을 잠시 숨긴다
  footerHeight?: number;
  onTutor: () => void;
  overlayRevision?: number;
}

const { width: W, height: H, top } = CLASSROOM;
const seatOf = (id: string) => top.seats.find((s) => s.id === id)!;

const ICON: Record<SoundId, string> = { clock: '🕒', pencil: '✏️', breeze: '🌿', hum: '🎧' };
const SEED = [
  { who: 'Luna', text: 'just started studying!' },
  { who: 'Hieu', text: 'same here :)' },
  { who: 'Chi', text: 'good luck!!' },
];
const LATER = [
  { who: 'Chi', text: 'one more page, then a break' },
  { who: 'Luna', text: 'the sunlight is nice today' },
];

export function ClassroomHud({ seat, soundOn, onToggleSound, onMixer, raised, dimmed = false, footerHeight = 0, onTutor, overlayRevision = 0 }: Props) {
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState(SEED);
  const [draft, setDraft] = useState('');
  const list = useRef<HTMLUListElement>(null);
  useEffect(() => { setChatOpen(false); }, [overlayRevision]);

  // 친구들의 말은 드물게만(두 번) 올라온다
  useEffect(() => {
    const ids = LATER.map((m, i) => window.setTimeout(() => setMessages((all) => [...all, m]), 40_000 * (i + 1)));
    return () => ids.forEach(clearTimeout);
  }, []);
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [messages, chatOpen]);

  const send = () => {
    if (!draft.trim()) return;
    setMessages((all) => [...all, { who: 'You', text: draft.trim() }]);
    setDraft('');
  };

  return (
    <>
      {/* 미니맵: 탑뷰 교실 위에 사람 위치 점 */}
      <motion.aside className={styles.minimap} aria-label={`Classroom 1-1 map. ${CLASSMATES.length + 1} people here`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
        <div className={styles.mapHead}>
          <span>Classroom 1-1</span>
          <b>
            <PeopleIcon width={14} height={14} /> {CLASSMATES.length + 1}
          </b>
        </div>
        <div className={styles.map}>
          <div className={styles.mapInner}>
          <img src={top.src} alt="" draggable={false} />
          {CLASSMATES.map((m) => {
            const s = seatOf(m.topSeat);
            return <i key={m.id} style={{ left: `${(s.x / W) * 100}%`, top: `${(s.y / H) * 100}%` }} />;
          })}
          <i className={styles.meDot} style={{ left: `${(seat.x / W) * 100}%`, top: `${(seat.y / H) * 100}%` }} />
          </div>
        </div>
      </motion.aside>

      {/* 소리 아이콘: 하나씩 켜고 끈다(믹서와 같은 채널) */}
      <div className={`${styles.sounds} ${raised ? styles.raised : ''} ${dimmed ? styles.dimmed : ''}`} style={footerHeight ? { bottom: footerHeight + 12 } : undefined} inert={dimmed} aria-hidden={dimmed || undefined} role="group" aria-label="Ambient sounds">
        {SOUNDS.map((s) => {
          const on = soundOn(s.id);
          return (
            <button key={s.id} type="button" className={on ? styles.soundOn : ''} onClick={() => onToggleSound(s.id)} aria-pressed={on} aria-label={`${s.label} sound ${on ? 'on' : 'off'}`} title={`${s.label} sound`} data-tip={`${s.label} sound`}>
              <span aria-hidden>{ICON[s.id]}</span>
            </button>
          );
        })}
        <button type="button" onClick={onMixer} aria-label="Open sound mixer" title="Sound mixer" data-tip="Sound mixer">
          <span aria-hidden>🎚️</span>
        </button>
      </div>

      {/* 데모 채팅 */}
      <div className={`${styles.chat} ${raised ? styles.raised : ''} ${dimmed ? styles.dimmed : ''}`} style={footerHeight ? { bottom: footerHeight + 12 } : undefined} inert={dimmed} aria-hidden={dimmed || undefined}>
        <AnimatePresence initial={false}>
          {chatOpen && (
            <motion.div className={styles.chatPanel} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
              <ul ref={list} aria-live="polite">
                {messages.map((m, i) => (
                  <li key={i} className={m.who === 'You' ? styles.mine : ''}>
                    <b>{m.who}</b> {m.text}
                  </li>
                ))}
              </ul>
              <div className={styles.chatInput}>
                <input value={draft} maxLength={60} placeholder="Type a message…" aria-label="Message" onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
                <button type="button" onClick={send} disabled={!draft.trim()} aria-label="Send">
                  ›
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className={styles.toggles}><button type="button" className={styles.chatToggle} onClick={onTutor}>Tutor</button><button type="button" className={styles.chatToggle} onClick={() => setChatOpen((o) => !o)} aria-expanded={chatOpen}>
          💬 {chatOpen ? 'Hide chat' : `Chat · ${messages.length}`}
        </button></div>
      </div>
    </>
  );
}
