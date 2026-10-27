export type FocusMode = 'timer' | 'pomodoro';
export interface FocusSession {
  mode: FocusMode;
  subject: string;
  stage: 'focus' | 'break' | 'return' | 'complete';
  status: 'running' | 'paused';
  focusDurationMs: number;
  remainingMs: number;
  deadline: number;
  focusedMs: number;
  rounds: number;
}
const BREAK_MS = 5 * 60_000;

export function startSession(mode: FocusMode, minutes: number, subject: string, now: number): FocusSession {
  const duration = (mode === 'pomodoro' ? 25 : Math.max(1, Math.min(720, Number.isFinite(minutes) ? minutes : 25))) * 60_000;
  return { mode, subject, stage: 'focus', status: 'running', focusDurationMs: duration, remainingMs: duration, deadline: now + duration, focusedMs: 0, rounds: 0 };
}

// Deadlines keep time accurate when a tab is backgrounded or a different room is open.
export function advanceSession(state: FocusSession, now: number): FocusSession {
  if (state.status === 'paused' || state.stage === 'return' || state.stage === 'complete') return state;
  const left = Math.max(0, state.deadline - now);
  if (left > 0) return left === state.remainingMs ? state : { ...state, remainingMs: left };
  if (state.stage === 'break') return { ...state, stage: 'return', remainingMs: 0 };
  const finished = { ...state, focusedMs: state.focusedMs + state.focusDurationMs, rounds: state.rounds + 1 };
  if (state.mode === 'timer') return { ...finished, stage: 'complete', remainingMs: 0 };
  const deadline = state.deadline + BREAK_MS;
  return { ...finished, stage: now >= deadline ? 'return' : 'break', remainingMs: Math.max(0, deadline - now), deadline };
}

export function pauseSession(state: FocusSession, now: number): FocusSession {
  const current = advanceSession(state, now);
  return current.stage === 'focus' ? { ...current, status: 'paused' } : current;
}
export function resumeSession(state: FocusSession, now: number): FocusSession {
  return state.stage === 'focus' && state.status === 'paused' ? { ...state, status: 'running', deadline: now + state.remainingMs } : state;
}
export function nextRound(state: FocusSession, now: number): FocusSession {
  const current = advanceSession(state, now);
  return current.stage === 'return' ? { ...current, stage: 'focus', status: 'running', remainingMs: current.focusDurationMs, deadline: now + current.focusDurationMs } : current;
}
export function endSession(state: FocusSession, now: number): FocusSession {
  const current = advanceSession(state, now);
  const partial = current.stage === 'focus' ? current.focusDurationMs - current.remainingMs : 0;
  return { ...current, stage: 'complete', remainingMs: 0, focusedMs: current.focusedMs + partial };
}
export function formatCountdown(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
