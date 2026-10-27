// Classroom focus HUD: minimap (my seat, friend positions, head count) + sound icons (individual ON/OFF) + light demo chat
// Chat is a local demo that only lasts for this session (no server). It's a quiet space, so it starts collapsed
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { SOUNDS, type SoundId } from '../audio/soundscape';
import { CLASSMATES } from '../data/classmates';
import { useT } from '../i18n';
import { CLASSROOM, type Seat } from '../data/places';
import { PeopleIcon } from './Icons';
import styles from './ClassroomHud.module.css';

interface Props {
  seat: Seat;
  soundOn: (id: SoundId) => boolean;
  onToggleSound: (id: SoundId) => void;
  onMixer: () => void;
  raised: boolean; // When the timer panel is below
  dimmed?: boolean; // When the note window is open above: temporarily hide the sound buttons and chat
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
  const t = useT();
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState(SEED);
  const [draft, setDraft] = useState('');
  const list = useRef<HTMLUListElement>(null);
  useEffect(() => { setChatOpen(false); }, [overlayRevision]);

  // Friends speak only rarely (twice)
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
      {/* Minimap: dots for people on the top-view classroom */}
      <motion.aside className={styles.minimap} aria-label={t('Classroom 1-1 map. {n} people here', { n: CLASSMATES.length + 1 })} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
        <div className={styles.mapHead}>
          <span>{t('Classroom 1-1')}</span>
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

      {/* Sound icons: toggle each one on/off (same channels as the mixer) */}
      <div className={`${styles.sounds} ${raised ? styles.raised : ''} ${dimmed ? styles.dimmed : ''}`} style={footerHeight ? { bottom: footerHeight + 12 } : undefined} inert={dimmed} aria-hidden={dimmed || undefined} role="group" aria-label="Ambient sounds">
        {SOUNDS.map((s) => {
          const on = soundOn(s.id);
          return (
            <button key={s.id} type="button" className={on ? styles.soundOn : ''} onClick={() => onToggleSound(s.id)} aria-pressed={on} aria-label={t(on ? '{sound} sound on' : '{sound} sound off', { sound: t(s.label) })} title={t('{sound} sound', { sound: t(s.label) })} data-tip={t('{sound} sound', { sound: t(s.label) })}>
              <span aria-hidden>{ICON[s.id]}</span>
            </button>
          );
        })}
        <button type="button" onClick={onMixer} aria-label={t('Open sound mixer')} title={t('Sound mixer')} data-tip={t('Sound mixer')}>
          <span aria-hidden>🎚️</span>
        </button>
      </div>

      {/* Demo chat */}
      <div className={`${styles.chat} ${raised ? styles.raised : ''} ${dimmed ? styles.dimmed : ''}`} style={footerHeight ? { bottom: footerHeight + 12 } : undefined} inert={dimmed} aria-hidden={dimmed || undefined}>
        <AnimatePresence initial={false}>
          {chatOpen && (
            <motion.div className={styles.chatPanel} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
              <ul ref={list} aria-live="polite">
                {messages.map((m, i) => (
                  <li key={i} className={m.who === 'You' ? styles.mine : ''}>
                    <b>{m.who === 'You' ? t('You') : m.who}</b> {m.who === 'You' ? m.text : t(m.text)}
                  </li>
                ))}
              </ul>
              <div className={styles.chatInput}>
                <input value={draft} maxLength={60} placeholder={t('Type a message…')} aria-label={t('Message')} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
                <button type="button" onClick={send} disabled={!draft.trim()} aria-label={t('Send')}>
                  ›
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className={styles.toggles}><button type="button" className={styles.chatToggle} onClick={onTutor}>{t('Tutor')}</button><button type="button" className={styles.chatToggle} onClick={() => setChatOpen((o) => !o)} aria-expanded={chatOpen}>
          💬 {chatOpen ? t('Hide chat') : t('Chat · {n}', { n: messages.length })}
        </button></div>
      </div>
    </>
  );
}
