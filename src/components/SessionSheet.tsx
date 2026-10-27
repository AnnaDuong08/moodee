import { useEffect, useMemo, useState } from 'react';
import { getWeekDays, guestPlans, localDate, type AgendaEvent, type StudyPlan } from '../lib/calendar';
import { currentAccountId, googleConfigured, listGoogleAgenda } from '../lib/googleConnection';
import { agendaChoicesForDate } from '../lib/sessionAgenda';
import { customSubjects, SUBJECT_PRESETS } from '../lib/sessions';
import { loadValue } from '../lib/storage';
import { Sheet } from './Sheet';
import styles from './SessionSheet.module.css';
import type { FocusMode } from '../lib/focusSession';

interface Props {
  open: boolean;
  minutes: number;
  subject: string;
  initialEventId?: string;
  agendaDate?: string;
  onMinutes: (minutes: number) => void;
  onSubject: (subject: string) => void;
  onStart: () => void;
  onClose?: () => void;
  mode?: FocusMode;
  onMode?: (mode: FocusMode) => void;
}

// One minute keeps the focus and reward flow easy to demonstrate.
const DURATIONS = [15, 25, 50, 1];

export function SessionSheet({ open, minutes, subject, initialEventId, agendaDate, onMinutes, onSubject, onStart, onClose = () => {}, mode = 'timer', onMode }: Props) {
  const date = agendaDate ?? localDate(new Date());
  const [localPlans, setLocalPlans] = useState<StudyPlan[]>([]);
  const [remoteEvents, setRemoteEvents] = useState<AgendaEvent[]>([]);
  const [usingCachedAgenda, setUsingCachedAgenda] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(initialEventId);
  const choices = useMemo(() => agendaChoicesForDate(date, localPlans, remoteEvents), [date, localPlans, remoteEvents]);
  const quickPicks = useMemo(() => [...SUBJECT_PRESETS, ...customSubjects().slice(-3).filter((item) => !SUBJECT_PRESETS.includes(item))], []);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLocalPlans(guestPlans.list());
    setRemoteEvents([]);
    setUsingCachedAgenda(false);
    if (googleConfigured) void (async () => {
      const accountId = await currentAccountId();
      if (!active || !accountId) return;
      const week = localDate(getWeekDays(new Date(`${date}T12:00:00`))[0]);
      const cached = loadValue<AgendaEvent[]>(`calendarCache:${accountId}:${week}`, []);
      setRemoteEvents(cached);
      const dayStart = new Date(`${date}T00:00:00`);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      try {
        const events = await listGoogleAgenda(dayStart.toISOString(), dayEnd.toISOString());
        if (active) { setRemoteEvents(events); setUsingCachedAgenda(false); }
      } catch {
        if (active) setUsingCachedAgenda(cached.length > 0);
      }
    })();
    return () => { active = false; };
  }, [open, date]);

  const choose = (value: string, eventId?: string) => {
    onSubject(value.slice(0, 300));
    setSelectedEventId(eventId);
  };

  return (
    <Sheet open={open} onClose={onClose} belowHeader title="Plan this session" subtitle="Choose your rhythm and one thing to work on." action={<button type="button" className={styles.back} onClick={onClose} aria-label="Back to seats">Back</button>}>
      <div className={`${styles.chips} ${styles.modes}`} role="radiogroup" aria-label="Focus rhythm">
        <button type="button" role="radio" aria-checked={mode === 'timer'} className={`${styles.chip} ${mode === 'timer' ? styles.on : ''}`} onClick={() => onMode?.('timer')}>Timer</button>
        <button type="button" role="radio" aria-checked={mode === 'pomodoro'} className={`${styles.chip} ${mode === 'pomodoro' ? styles.on : ''}`} onClick={() => onMode?.('pomodoro')}>Pomodoro <small>25 / 5</small></button>
      </div>
      {mode === 'pomodoro' ? <p className={styles.pomodoroHint}>25 minutes to focus, 5 minutes to wander. Your break timer follows you between spaces.</p> : <>
      <h3 className={styles.heading}>How long?</h3>
      <div className={styles.chips} role="radiogroup" aria-label="Session length">
        {DURATIONS.map((duration) => (
          <button key={duration} type="button" role="radio" aria-checked={minutes === duration} className={`${styles.chip} ${minutes === duration ? styles.on : ''}`} onClick={() => onMinutes(duration)}>
            {duration} min{duration === 1 && <small> · demo</small>}
          </button>
        ))}
      </div>
      </>}
      <h3 className={styles.heading}>What are you studying?</h3>
      {choices.length > 0 && <section className={styles.agenda} aria-label="Plans for this day">
        <div className={styles.agendaHeading}><span>From your calendar</span><small>{usingCachedAgenda ? 'Saved agenda' : new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</small></div>
        <div className={styles.eventList}>{choices.map((choice) => (
          <button key={`${choice.calendarId}:${choice.id}`} type="button" className={`${styles.eventChoice} ${selectedEventId === choice.id ? styles.eventOn : ''}`} aria-pressed={selectedEventId === choice.id} aria-label={`Use ${choice.title} from ${choice.calendarName}`} onClick={() => choose(choice.title, choice.id)}>
            <span className={styles.eventTime}>{choice.startsAt.includes('T') ? new Date(choice.startsAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : 'All day'}</span>
            <span className={styles.eventDetails}><b>{choice.title}</b><small>{choice.calendarName}</small></span>
          </button>
        ))}</div>
      </section>}
      <div className={styles.chips} aria-label="Quick study choices">
        {quickPicks.map((item) => <button key={item} type="button" className={`${styles.chip} ${subject === item && !selectedEventId ? styles.on : ''}`} aria-pressed={subject === item && !selectedEventId} onClick={() => choose(item)}>{item}</button>)}
      </div>
      <input className={styles.input} aria-label="What are you studying?" value={subject} maxLength={300} onChange={(event) => choose(event.target.value)} placeholder="Or type your own — e.g. UX assignment" />
      <button type="button" className={`pill pill-primary ${styles.start}`} disabled={!subject.trim()} onClick={onStart}>{mode === 'pomodoro' ? 'Start Pomodoro' : `Start ${minutes} min`}</button>
      <p className={styles.note}>Classmates only see what you're studying — no chat.</p>
    </Sheet>
  );
}
