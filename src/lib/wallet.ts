// Wallet & inventory store: coins, plan, unlocked Cloudees/parts/objects, room layout
// Any screen that subscribes via useWallet() re-renders as soon as coins change (saved to localStorage)
import { useSyncExternalStore } from 'react';
import { CLOUDEE_PRICE, DEMO_TOPUP, MONTHLY_REWARDS, OBJECTS, ROOM_LOOKS, STAMP_REWARDS, WARDROBE } from '../config/economy';
import type { Character, CharacterId } from '../data/characters';
import { load, loadValue, save } from './storage';

export type Plan = 'free' | 'pro';

export interface Wallet {
  coins: number;
  plan: Plan;
  lastDaily: string | null; // (Previous version) last day daily coins were received
  stampCount: number; // Number of stamps on the current 7-day stamp card
  stampReady: string | null; // Day the stamp became claimable (finished that day's first session)
  lastStamp: string | null; // Last day a stamp was claimed
  cloudees: CharacterId[]; // Characters available to use
  parts: string[]; // Unlocked wardrobe parts
  wearing: Record<string, string>; // Selected part per tab
  objects: string[]; // Owned room objects
  room: Record<string, string>; // Slot → object
  rewards: string[]; // Monthly rewards claimed
  drinks: number; // Number of cups ordered at the café
  roomLooks: string[]; // Owned room styles
  roomLook: string; // Current room style
}

const KEY = 'wallet';
// Cloudees available from the start (the default 4), free objects
const EMPTY: Wallet = {
  coins: 0,
  plan: 'free',
  lastDaily: null,
  stampCount: 0,
  stampReady: null,
  lastStamp: null,
  cloudees: ['bob', 'ponytail', 'wavy', 'curly-glasses'],
  parts: [],
  wearing: {},
  objects: OBJECTS.filter((o) => o.price === 0).map((o) => o.id),
  room: {},
  rewards: [],
  drinks: 0,
  roomLooks: ROOM_LOOKS.filter((r) => r.price === 0).map((r) => r.id),
  roomLook: 'classic',
};

let state: Wallet = load<Wallet>(KEY, EMPTY);
// Characters already chosen in a previous version stay usable
const current = loadValue<CharacterId | null>('character', null);
if (current && !state.cloudees.includes(current)) state = { ...state, cloudees: [...state.cloudees, current] };
// Anyone can choose the 4 default characters (only premium Cloudy is locked)
state = { ...state, cloudees: [...new Set([...EMPTY.cloudees, ...state.cloudees])] };

const listeners = new Set<() => void>();
const set = (patch: Partial<Wallet>) => {
  state = { ...state, ...patch };
  save(KEY, state);
  listeners.forEach((fn) => fn());
};

export const getWallet = () => state;
export function useWallet() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
    () => state,
  );
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

export const earn = (n: number) => set({ coins: state.coins + n });

// false if coins are short
export function spend(n: number) {
  if (state.coins < n) return false;
  set({ coins: state.coins - n });
  return true;
}

// When today's first session is finished: make today's stamp "claimable" (coins are received when stamping in the shop). true if it was newly enabled
export function markStampReady() {
  if (state.lastStamp === today() || state.stampReady === today()) return false;
  set({ stampReady: today(), stampCount: state.stampCount >= STAMP_REWARDS.free.length ? 0 : state.stampCount });
  return true;
}
export const stampedToday = (w: Wallet) => w.lastStamp === today();
export const stampPending = (w: Wallet) => w.stampReady === today() && w.lastStamp !== today();

// Claim today's stamp in the shop. Coins received (0 if none)
export function claimStamp() {
  if (!stampPending(state)) return 0;
  const i = Math.min(state.stampCount, STAMP_REWARDS.free.length - 1);
  const gain = STAMP_REWARDS[state.plan][i];
  set({ coins: state.coins + gain, stampCount: state.stampCount + 1, lastStamp: today(), stampReady: null });
  return gain;
}

export const setPlan = (plan: Plan) => set({ plan });
export const demoTopUp = () => earn(DEMO_TOPUP);

// Whether this Cloudee can be used: premium (Cloudy) on the Pro plan, others if in the unlocked list
export const hasCloudee = (w: Wallet, c: Pick<Character, 'id' | 'premium'>) => (c.premium ? w.plan === 'pro' : w.cloudees.includes(c.id));

export function unlockCloudee(id: CharacterId) {
  if (state.cloudees.includes(id)) return true;
  if (!spend(CLOUDEE_PRICE)) return false;
  set({ cloudees: [...state.cloudees, id] });
  return true;
}

const partPrice = (id: string) => WARDROBE.flatMap((t) => [...t.items]).find((i) => i.id === id)?.price ?? 0;
export const ownsPart = (w: Wallet, id: string) => partPrice(id) === 0 || w.parts.includes(id);

export function unlockPart(id: string) {
  if (ownsPart(state, id)) return true;
  if (!spend(partPrice(id))) return false;
  set({ parts: [...state.parts, id] });
  return true;
}
export const wear = (tab: string, id: string) => set({ wearing: { ...state.wearing, [tab]: id } });

export function unlockObject(id: string) {
  if (state.objects.includes(id)) return true;
  const price = OBJECTS.find((o) => o.id === id)?.price ?? 0;
  if (!spend(price)) return false;
  set({ objects: [...state.objects, id] });
  return true;
}
export const giveObject = (id: string) => !state.objects.includes(id) && set({ objects: [...state.objects, id] });
export const placeInRoom = (slot: string, id: string | null) => {
  const room = { ...state.room };
  if (id) room[slot] = id;
  else delete room[slot];
  set({ room });
};

// Claim a monthly reward (Pro, after studying the required number of days)
export function claimReward(id: string, studiedDays: number) {
  const r = MONTHLY_REWARDS.find((x) => x.id === id);
  if (!r || state.plan !== 'pro' || studiedDays < r.day || state.rewards.includes(id)) return false;
  set({ rewards: [...state.rewards, id] });
  return true;
}

export function orderDrink(price: number) {
  if (!spend(price)) return false;
  set({ drinks: state.drinks + 1 });
  return true;
}

export function unlockRoomLook(id: string) {
  if (state.roomLooks.includes(id)) return true;
  const price = ROOM_LOOKS.find((r) => r.id === id)?.price ?? 0;
  if (!spend(price)) return false;
  set({ roomLooks: [...state.roomLooks, id], roomLook: id });
  return true;
}
export const setRoomLook = (id: string) => set({ roomLook: id });
