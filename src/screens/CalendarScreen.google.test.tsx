// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CalendarScreen } from './CalendarScreen';
import { connectionStatus, currentAccountId, listGoogleAgenda } from '../lib/googleConnection';
import { getWeekDays, localDate } from '../lib/calendar';
import { save } from '../lib/storage';

vi.mock('../lib/googleConnection', () => ({
  googleConfigured: true,
  currentAccountId: vi.fn(async () => 'user-a'),
  connectionStatus: vi.fn(async () => ({ connected: true, email: 'student@example.com' })),
  listGoogleAgenda: vi.fn(async () => [{ id: 'external', calendarId: 'personal', calendarName: 'Personal', title: 'Seminar notes', startsAt: new Date(new Date().setHours(10, 0, 0, 0)).toISOString(), endsAt: new Date(new Date().setHours(11, 0, 0, 0)).toISOString(), source: 'google', readOnly: true, etag: 'v1' }]),
}));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.mocked(currentAccountId).mockResolvedValue('user-a');
  vi.mocked(connectionStatus).mockResolvedValue({ connected: true, email: 'student@example.com' });
  vi.mocked(listGoogleAgenda).mockResolvedValue([{ id: 'external', calendarId: 'personal', calendarName: 'Personal', title: 'Seminar notes', startsAt: new Date(new Date().setHours(10, 0, 0, 0)).toISOString(), endsAt: new Date(new Date().setHours(11, 0, 0, 0)).toISOString(), source: 'google', readOnly: true, etag: 'v1' }]);
});
afterEach(cleanup);

it('updates the connection immediately when OAuth finishes after Calendar opens', async () => {
  vi.mocked(connectionStatus)
    .mockResolvedValueOnce({ connected: false, email: null })
    .mockResolvedValue({ connected: true, email: 'student@example.com' });
  const props = { onBack: () => {}, onStart: () => {} };
  const { rerender } = render(<CalendarScreen {...props} connectionRevision={0} />);
  await waitFor(() => expect(connectionStatus).toHaveBeenCalledTimes(1));
  rerender(<CalendarScreen {...props} connectionRevision={1} />);
  await waitFor(() => expect(screen.getByText('Google Calendar connected')).toBeTruthy());
  expect(screen.getByText('student@example.com')).toBeTruthy();
});

it('shows a checking state instead of Connect while account status is loading', async () => {
  let finishStatus!: (status: { connected: boolean; email: string | null }) => void;
  vi.mocked(connectionStatus).mockImplementationOnce(() => new Promise((resolve) => { finishStatus = resolve; }));
  render(<CalendarScreen onBack={() => {}} onStart={() => {}} />);
  await waitFor(() => expect(screen.getByText('Checking Google Calendar…')).toBeTruthy());
  expect(screen.queryByRole('button', { name: 'Connect' })).toBeNull();
  finishStatus({ connected: true, email: 'student@example.com' });
  await waitFor(() => expect(screen.getByText('Google Calendar connected')).toBeTruthy());
});

it('offers a read-only Google event as a session goal without offering edit', async () => {
  const onStart = vi.fn();
  render(<CalendarScreen onBack={() => {}} onStart={onStart} />);
  await waitFor(() => expect(screen.getByText('Seminar notes')).toBeTruthy());
  expect(screen.queryByRole('button', { name: 'Edit Seminar notes' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Start Seminar notes' }));
  expect(onStart).toHaveBeenCalledWith('Seminar notes', 'external', localDate(new Date()));
});

it('shows the current account cached agenda read only when Google fails', async () => {
  const week = localDate(getWeekDays(new Date())[0]);
  save(`calendarCache:user-a:${week}`, [{ id: 'own', calendarId: 'moodie', calendarName: 'MOODEE', title: 'Cached plan', startsAt: new Date(new Date().setHours(10, 0, 0, 0)).toISOString(), endsAt: new Date(new Date().setHours(11, 0, 0, 0)).toISOString(), source: 'moodie', readOnly: false, etag: 'v1' }]);
  vi.mocked(listGoogleAgenda).mockRejectedValue(new Error('offline'));
  render(<CalendarScreen onBack={() => {}} onStart={() => {}} />);
  await waitFor(() => expect(screen.getByText('Cached plan')).toBeTruthy());
  expect(screen.queryByRole('button', { name: 'Edit Cached plan' })).toBeNull();
  expect(screen.getByRole('button', { name: 'New plan' }).hasAttribute('disabled')).toBe(true);
});

it('does not expose another account cached agenda', async () => {
  const week = localDate(getWeekDays(new Date())[0]);
  save(`calendarCache:user-a:${week}`, [{ id: 'a', calendarId: 'moodie', calendarName: 'MOODEE', title: 'Only Alice', startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 3600000).toISOString(), source: 'moodie', readOnly: false }]);
  vi.mocked(currentAccountId).mockResolvedValue('user-b');
  vi.mocked(listGoogleAgenda).mockRejectedValue(new Error('offline'));
  render(<CalendarScreen onBack={() => {}} onStart={() => {}} />);
  await waitFor(() => expect(screen.getByText(/Last saved agenda is read only/i)).toBeTruthy());
  expect(screen.queryByText('Only Alice')).toBeNull();
});
