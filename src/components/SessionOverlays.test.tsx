// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { BreakTimer, SessionExitDialog } from './SessionOverlays';
import { advanceSession, startSession } from '../lib/focusSession';

afterEach(cleanup);
it('allows cancelling an exit without ending the session and requires explicit confirmation', () => {
  const cancel = vi.fn();
  const confirm = vi.fn();
  render(<SessionExitDialog kind="exit" onCancel={cancel} onConfirm={confirm} />);
  fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });
  expect(cancel).toHaveBeenCalledOnce();
  expect(confirm).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'End and leave' }));
  expect(confirm).toHaveBeenCalledOnce();
});
it('shows the remaining break in another space and asks to return after it expires', () => {
  const state = advanceSession(startSession('pomodoro', 25, 'Read notes', 0), 1560000);
  const onReturn = vi.fn();
  const { rerender } = render(<BreakTimer session={state} onReturn={onReturn} onEnd={() => {}} />);
  expect(screen.getByText('04:00')).toBeTruthy();
  expect(screen.queryByRole('dialog')).toBeNull();
  rerender(<BreakTimer session={advanceSession(state, 1800000)} onReturn={onReturn} onEnd={() => {}} />);
  expect(screen.getByRole('dialog', { name: 'Time to return' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Back to focus' }));
  expect(onReturn).toHaveBeenCalledOnce();
});
