// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { addDays, getWeekDays, guestPlans, localDate } from '../lib/calendar';
import { CalendarScreen } from './CalendarScreen';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

it('creates a guest plan and offers its goal for a session', async () => {
  const onStart = vi.fn();
  render(<CalendarScreen onBack={() => {}} onStart={onStart} />);
  fireEvent.click(screen.getByRole('button', { name: /new plan/i }));
  fireEvent.change(screen.getByRole('textbox', { name: /what will you do/i }), { target: { value: 'Read chapter 4' } });
  fireEvent.click(screen.getByRole('button', { name: /save plan/i }));
  await waitFor(() => expect(guestPlans.list()).toHaveLength(1));
  fireEvent.click(screen.getByRole('button', { name: /start read chapter 4/i }));
  expect(onStart).toHaveBeenCalledWith('Read chapter 4', expect.any(String), localDate(new Date()));
});

it('moves between weeks and shows plans on the selected day', async () => {
  const nextMonday = addDays(getWeekDays(new Date())[0], 7);
  const date = localDate(nextMonday);
  guestPlans.create({ title: 'Next week reading', startsAt: new Date(`${date}T09:00:00`).toISOString(), durationMinutes: 30, reminderMinutes: null });
  render(<CalendarScreen onBack={() => {}} onStart={() => {}} />);
  expect(screen.queryByText('Next week reading')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Next week' }));
  expect(screen.getByText('Next week reading')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Previous week' }));
  expect(screen.queryByText('Next week reading')).toBeNull();
});
