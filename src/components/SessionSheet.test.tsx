// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { getWeekDays, guestPlans, localDate, type AgendaEvent } from '../lib/calendar';
import { currentAccountId, listGoogleAgenda } from '../lib/googleConnection';
import { save } from '../lib/storage';
import { SessionSheet } from './SessionSheet';

vi.mock('../lib/googleConnection', () => ({
  googleConfigured: true,
  currentAccountId: vi.fn(async () => 'user-a'),
  listGoogleAgenda: vi.fn(async () => []),
}));

const date = '2026-10-01';
const googleEvent: AgendaEvent = {
  id: 'google-event', calendarId: 'personal', calendarName: 'Personal', title: 'Seminar notes',
  startsAt: new Date(`${date}T10:00:00`).toISOString(), endsAt: new Date(`${date}T11:00:00`).toISOString(),
  source: 'google', readOnly: true,
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.mocked(currentAccountId).mockResolvedValue('user-a');
  vi.mocked(listGoogleAgenda).mockResolvedValue([googleEvent]);
});
afterEach(cleanup);

it('lets the user return to the seats without starting a session', () => {
  const onClose = vi.fn();
  render(<SessionSheet open minutes={25} subject="Coding" onClose={onClose} onMinutes={() => {}} onSubject={() => {}} onStart={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Back to seats' }));
  expect(onClose).toHaveBeenCalledOnce();
});

it('offers Pomodoro separately from a standard timer and requires a goal in either mode', () => {
  const onMode = vi.fn();
  const { rerender } = render(<SessionSheet open minutes={50} subject="" mode="timer" onMode={onMode} onMinutes={() => {}} onSubject={() => {}} onStart={() => {}} />);
  fireEvent.click(screen.getByRole('radio', { name: /Pomodoro/ }));
  expect(onMode).toHaveBeenCalledWith('pomodoro');
  rerender(<SessionSheet open minutes={50} subject="" mode="pomodoro" onMode={onMode} onMinutes={() => {}} onSubject={() => {}} onStart={() => {}} />);
  expect(screen.getByRole('button', { name: 'Start Pomodoro' }).hasAttribute('disabled')).toBe(true);
  expect(screen.queryByRole('radiogroup', { name: 'Session length' })).toBeNull();
});

it('asks for an activity only after sitting, and requires a nonblank answer to start', () => {
  const onMinutes = vi.fn();
  const onSubject = vi.fn();
  const onStart = vi.fn();
  const { rerender } = render(<SessionSheet open minutes={25} subject="" agendaDate={date} onMinutes={onMinutes} onSubject={onSubject} onStart={onStart} />);
  expect(screen.getByRole('dialog', { name: 'Plan this session' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Start 25 min' }).hasAttribute('disabled')).toBe(true);
  fireEvent.click(screen.getByRole('radio', { name: '15 min' }));
  expect(onMinutes).toHaveBeenCalledWith(15);
  fireEvent.click(screen.getByRole('button', { name: 'Coding' }));
  expect(onSubject).toHaveBeenCalledWith('Coding');
  rerender(<SessionSheet open minutes={15} subject="Coding" agendaDate={date} onMinutes={onMinutes} onSubject={onSubject} onStart={onStart} />);
  fireEvent.click(screen.getByRole('button', { name: 'Start 15 min' }));
  expect(onStart).toHaveBeenCalledOnce();
});

it('offers only plans overlapping the selected day and uses Google event titles', async () => {
  guestPlans.create({ title: 'Write report', startsAt: new Date(`${date}T09:00:00`).toISOString(), durationMinutes: 25, reminderMinutes: 10 });
  guestPlans.create({ title: 'Tomorrow only', startsAt: new Date('2026-10-02T09:00:00').toISOString(), durationMinutes: 25, reminderMinutes: 10 });
  const onSubject = vi.fn();
  render(<SessionSheet open minutes={25} subject="" agendaDate={date} onMinutes={() => {}} onSubject={onSubject} onStart={() => {}} />);
  expect(screen.getByRole('button', { name: 'Use Write report from MOODEE plan' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Tomorrow only/ })).toBeNull();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Use Seminar notes from Personal' })).toBeTruthy());
  fireEvent.click(screen.getByRole('button', { name: 'Use Seminar notes from Personal' }));
  expect(onSubject).toHaveBeenCalledWith('Seminar notes');
});

it('shows a saved account agenda when Google is offline', async () => {
  const week = localDate(getWeekDays(new Date(`${date}T12:00:00`))[0]);
  save(`calendarCache:user-a:${week}`, [googleEvent]);
  vi.mocked(listGoogleAgenda).mockRejectedValue(new Error('offline'));
  render(<SessionSheet open minutes={25} subject="" agendaDate={date} onMinutes={() => {}} onSubject={() => {}} onStart={() => {}} />);
  await waitFor(() => expect(screen.getByText('Saved agenda')).toBeTruthy());
  expect(screen.getByRole('button', { name: 'Use Seminar notes from Personal' })).toBeTruthy();
});
