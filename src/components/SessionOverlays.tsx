import { useEffect, useRef, type ReactNode } from 'react';
import { formatCountdown, type FocusSession } from '../lib/focusSession';
import styles from './SessionOverlays.module.css';

function SessionDialog({ title, alert = false, onEscape, children }: { title: string; alert?: boolean; onEscape?: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => { if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  return <div className={styles.backdrop}>
    <div ref={ref} className={styles.dialog} role={alert ? 'alertdialog' : 'dialog'} aria-modal="true" aria-label={title} onKeyDown={(event) => {
      if (event.key === 'Escape') { event.stopPropagation(); onEscape?.(); }
      if (event.key !== 'Tab') return;
      const buttons = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
      <h2>{title}</h2>{children}
    </div>
  </div>;
}

export function SessionExitDialog({ kind, onCancel, onConfirm }: { kind: 'exit' | 'stop'; onCancel: () => void; onConfirm: () => void }) {
  return <SessionDialog title={kind === 'exit' ? 'Leave this session?' : 'End this session?'} alert onEscape={onCancel}>
    <p>You can stay with your one thing a little longer. If you end now, your focus time will be saved.</p>
    <button type="button" className="pill pill-primary" onClick={onCancel}>Keep going</button>
    <button type="button" className={styles.secondary} onClick={onConfirm}>{kind === 'exit' ? 'End and leave' : 'End session'}</button>
  </SessionDialog>;
}

export function BreakTimer({ session, onReturn, onEnd }: { session: FocusSession; onReturn: () => void; onEnd: () => void }) {
  if (session.stage === 'return') return <SessionDialog title="Time to return">
    <span className={styles.eyebrow}>YOUR BREAK IS OVER</span>
    <p>Your seat is waiting. Ready for another 25 minutes of <b>{session.subject}</b>?</p>
    <button type="button" className="pill pill-primary" onClick={onReturn}>Back to focus</button>
    <button type="button" className={styles.secondary} onClick={onEnd}>End session</button>
  </SessionDialog>;
  if (session.stage !== 'break') return null;
  return <aside className={styles.breakTimer} aria-label="Pomodoro break timer">
    <div className={styles.breakHead}><span>BREAK TIME</span><b>{formatCountdown(session.remainingMs)}</b></div>
    <p title={session.subject}>{session.subject}</p>
    <div className={styles.breakActions}>
      <button type="button" onClick={onReturn}>Return to Classroom</button>
      <button type="button" onClick={onEnd} aria-label="End Pomodoro session">End</button>
    </div>
  </aside>;
}
