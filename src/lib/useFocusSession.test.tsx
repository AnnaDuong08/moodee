// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useFocusSession } from './useFocusSession';

afterEach(() => { cleanup(); vi.useRealTimers(); });
it('keeps the break deadline through rerenders and reconciles time on returning to the tab', () => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  const { result, rerender } = renderHook(() => useFocusSession());
  act(() => result.current.start('pomodoro', 25, 'Notes'));
  act(() => { vi.setSystemTime(1500000); window.dispatchEvent(new Event('focus')); });
  expect(result.current.session?.stage).toBe('break');
  rerender();
  act(() => { vi.setSystemTime(1801000); document.dispatchEvent(new Event('visibilitychange')); });
  expect(result.current.session?.stage).toBe('return');
  act(() => result.current.returnToFocus());
  expect(result.current.session?.remainingMs).toBe(1500000);
  act(() => result.current.end());
  expect(result.current.session?.focusedMs).toBe(1500000);
});
