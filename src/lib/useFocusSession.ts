import { useCallback, useEffect, useState } from 'react';
import { advanceSession, endSession, nextRound, pauseSession, resumeSession, startSession, type FocusMode, type FocusSession } from './focusSession';

export function useFocusSession() {
  const [session, setSession] = useState<FocusSession | null>(null);
  const start = useCallback((mode: FocusMode, minutes: number, subject: string) => setSession(startSession(mode, minutes, subject, Date.now())), []);
  const clear = useCallback(() => setSession(null), []);
  const end = useCallback(() => setSession((state) => state && endSession(state, Date.now())), []);
  const togglePause = useCallback(() => setSession((state) => state && (state.status === 'running' ? pauseSession(state, Date.now()) : resumeSession(state, Date.now()))), []);
  const returnToFocus = useCallback(() => setSession((state) => state && nextRound(state, Date.now())), []);
  const ticking = session !== null && session.status === 'running' && (session.stage === 'focus' || session.stage === 'break');
  useEffect(() => {
    if (!ticking) return;
    const tick = () => setSession((state) => state && advanceSession(state, Date.now()));
    const id = window.setInterval(tick, 250);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [ticking]);
  useEffect(() => {
    if (!session || session.stage === 'complete') return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [session !== null && session.stage !== 'complete']);
  return { session, start, clear, end, togglePause, returnToFocus };
}
export type FocusSessionController = ReturnType<typeof useFocusSession>;
