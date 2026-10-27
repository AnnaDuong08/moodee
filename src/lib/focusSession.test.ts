import { describe, expect, it } from 'vitest';
import { advanceSession, endSession, nextRound, pauseSession, resumeSession, startSession } from './focusSession';

describe('focus sessions', () => {
  it('starts Pomodoro with 25 minutes regardless of the standard duration', () => {
    const state = startSession('pomodoro', 50, 'Read', 1000);
    expect(state.remainingMs).toBe(1500000);
    expect(state.deadline).toBe(1501000);
  });
  it('starts a five minute break at the focus deadline and records only focus', () => {
    const state = advanceSession(startSession('pomodoro', 25, 'Read', 0), 1502000);
    expect(state.stage).toBe('break');
    expect(state.remainingMs).toBe(298000);
    expect(state.focusedMs).toBe(1500000);
    expect(advanceSession(state, 1503000).rounds).toBe(1);
  });
  it('prompts to return after a backgrounded focus and break, without starting another round', () => {
    const state = advanceSession(startSession('pomodoro', 25, 'Read', 0), 2000000);
    expect(state.stage).toBe('return');
    expect(state.remainingMs).toBe(0);
    expect(state.focusedMs).toBe(1500000);
    expect(advanceSession(state, 4000000)).toEqual(state);
  });
  it('resumes a new focus round only after returning', () => {
    const state = nextRound(advanceSession(startSession('pomodoro', 25, 'Read', 0), 1800000), 1900000);
    expect(state.stage).toBe('focus');
    expect(state.deadline).toBe(3400000);
    expect(endSession(state, 1960000).focusedMs).toBe(1560000);
  });
  it('finishes a standard timer without starting a break', () => {
    const state = advanceSession(startSession('timer', 1, 'Read', 0), 90000);
    expect(state.stage).toBe('complete');
    expect(state.focusedMs).toBe(60000);
  });
  it('excludes paused time and handles pause between timer ticks', () => {
    const paused = pauseSession(startSession('timer', 15, 'Read', 0), 10500);
    expect(paused.remainingMs).toBe(889500);
    expect(advanceSession(paused, 70000)).toEqual(paused);
    const resumed = resumeSession(paused, 100000);
    expect(resumed.deadline).toBe(989500);
    expect(endSession(resumed, 110000).focusedMs).toBe(20500);
  });
  it('does not count break time when stopping from another space', () => {
    const state = advanceSession(startSession('pomodoro', 25, 'Read', 0), 1620000);
    expect(endSession(state, 1700000).focusedMs).toBe(1500000);
  });
  it('does not allow a second round before the break has ended', () => {
    const state = advanceSession(startSession('pomodoro', 25, 'Read', 0), 1600000);
    expect(nextRound(state, 1650000).stage).toBe('break');
  });
});
