// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { App } from './App';
import { listSessions } from './lib/sessions';

// Replace graphics and audio browser APIs; navigation, session UI and timer stay real.
vi.mock('./components/SeatPicker', () => ({ SeatPicker: ({ onSit }: { onSit: (seat: unknown) => void }) => <button onClick={() => onSit({ id: '4C', side: 'right', x: 640, y: 1165 })}>Sit</button> }));
vi.mock('./components/SeatedScene', () => ({ SeatedScene: () => null }));
vi.mock('./audio/soundscape', () => ({ SOUNDS: [], soundscape: { stop: () => {}, chime: () => {} } }));
vi.mock('./audio/useSoundscape', () => ({ useSoundscape: () => ({ settings: { master: .8, sounds: {} }, playing: false, start: async () => {}, stop: () => {}, engine: { setMaster: () => {} } }) }));
vi.mock('./screens/IntroScreen', () => ({ IntroScreen: ({ onStart }: { onStart: () => void }) => <button onClick={onStart}>Enter</button> }));
vi.mock('./screens/CompanionSetupScreen', () => ({ CompanionSetupScreen: ({ onDone }: { onDone: () => void }) => <button onClick={onDone}>Choose friends</button> }));
vi.mock('./screens/CharacterSelectScreen', () => ({ CharacterSelectScreen: ({ onConfirm }: { onConfirm: (id: string) => void }) => <button onClick={() => onConfirm('dahyeon')}>Choose character</button> }));
vi.mock('./screens/HomeScreen', () => ({ HomeScreen: ({ onGo }: { onGo: (place: unknown) => void }) => <><h1>Home</h1><button onClick={() => onGo({ id: 'classroom', name: 'Classroom', available: true })}>Go Classroom</button><button onClick={() => onGo({ id: 'cafe', name: 'Café', available: false })}>Go Café</button></> }));
vi.mock('./screens/CafeScreen', () => ({ CafeScreen: () => <h1>Café</h1> }));
vi.mock('./lib/googleConnection', () => ({ googleConfigured: false, currentAccountId: async () => null, completeGoogleRedirect: async () => false }));

beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); vi.setSystemTime(0); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
function openPlan() {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Enter' }));
  fireEvent.click(screen.getByRole('button', { name: 'Choose friends' }));
  fireEvent.click(screen.getByRole('button', { name: 'Choose character' }));
  fireEvent.click(screen.getByRole('button', { name: 'Go Classroom' }));
  tick(2300);
  fireEvent.click(screen.getByRole('button', { name: 'Sit' }));
  tick(2000);
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  tick(300);
}

it('can leave before starting, and cancelling an exit keeps the active session running', () => {
  openPlan();
  fireEvent.click(screen.getByRole('button', { name: 'Leave classroom' }));
  tick(300);
  expect(screen.getByRole('heading', { name: 'Home' })).toBeTruthy();
  expect(listSessions()).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'Go Classroom' })); tick(2300);
  fireEvent.click(screen.getByRole('button', { name: 'Sit' })); tick(2000);
  fireEvent.click(screen.getByRole('button', { name: 'Next' })); tick(300);
  fireEvent.click(screen.getByRole('button', { name: 'Coding' }));
  fireEvent.click(screen.getByRole('button', { name: 'Start 25 min' })); tick(300);
  fireEvent.click(screen.getByRole('button', { name: 'Leave classroom' }));
  expect(screen.getByRole('alertdialog', { name: 'Leave this session?' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Keep going' })); tick(60000);
  expect(screen.getByText('24:00')).toBeTruthy();
  expect(listSessions()).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'Leave classroom' }));
  fireEvent.click(screen.getByRole('button', { name: 'End and leave' })); tick(300);
  expect(screen.getByRole('heading', { name: 'Home' })).toBeTruthy();
  expect(listSessions()).toHaveLength(1);
});

it('keeps a Pomodoro break through a visit to Café and returns to the same session', () => {
  openPlan();
  fireEvent.click(screen.getByRole('radio', { name: /Pomodoro/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Coding' }));
  fireEvent.click(screen.getByRole('button', { name: 'Start Pomodoro' }));
  tick(1500000);
  expect(screen.getByRole('button', { name: 'Explore spaces' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Explore spaces' }));
  fireEvent.click(screen.getByRole('button', { name: 'Go Café' })); tick(2300);
  expect(screen.getByRole('heading', { name: 'Café' })).toBeTruthy();
  expect(screen.getByRole('complementary', { name: 'Pomodoro break timer' })).toBeTruthy();
  expect(listSessions()).toHaveLength(0);
  tick(300000);
  fireEvent.click(screen.getByRole('button', { name: 'Back to focus' }));
  expect(screen.getByRole('button', { name: 'Seat 4C. Change seat' }).hasAttribute('disabled')).toBe(true);
  expect(screen.getByText('25:00')).toBeTruthy();
  tick(60000);
  fireEvent.click(screen.getByRole('button', { name: 'End' }));
  expect(screen.getByRole('alertdialog', { name: 'End this session?' })).toBeTruthy();
  expect(listSessions()).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'End session' }));
  expect(listSessions()).toHaveLength(1);
  expect(listSessions()[0]).toMatchObject({ subject: 'Coding', seat: '4C', minutes: 26 });
});

it('automatically saves a standard timer once and keeps the existing reward/check-in flow', () => {
  openPlan();
  fireEvent.click(screen.getByRole('radio', { name: /1 min/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Reading' }));
  fireEvent.click(screen.getByRole('button', { name: 'Start 1 min' }));
  tick(60000);
  expect(listSessions()).toHaveLength(1);
  expect(listSessions()[0]).toMatchObject({ subject: 'Reading', minutes: 1, seat: '4C' });
  expect(screen.queryByRole('button', { name: 'Explore spaces' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  tick(300);
  fireEvent.click(screen.getByRole('button', { name: /1\s*Easy/ }));
  expect(listSessions()[0].friction).toBe(1);
  tick(60000);
  expect(listSessions()).toHaveLength(1);
});
