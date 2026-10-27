// 지갑·보관함 스토어: 코인, 플랜, 잠금 해제한 Cloudee·파츠·오브젝트, 방 배치
// 화면 어디서든 useWallet()으로 구독하면 코인이 바뀔 때 바로 다시 그려진다(localStorage 저장)
import { useSyncExternalStore } from 'react';
import { CLOUDEE_PRICE, DEMO_TOPUP, MONTHLY_REWARDS, OBJECTS, ROOM_LOOKS, STAMP_REWARDS, WARDROBE } from '../config/economy';
import type { Character, CharacterId } from '../data/characters';
import { load, loadValue, save } from './storage';

export type Plan = 'free' | 'pro';

export interface Wallet {
  coins: number;
  plan: Plan;
  lastDaily: string | null; // (이전 버전) 마지막으로 하루 코인을 받은 날
  stampCount: number; // 이번 7일 도장판에서 찍은 도장 수
  stampReady: string | null; // 도장을 받을 수 있게 된 날(그날 첫 세션을 끝냄)
  lastStamp: string | null; // 마지막으로 도장을 받은 날
  cloudees: CharacterId[]; // 쓸 수 있는 캐릭터
  parts: string[]; // 잠금 해제한 옷장 파츠
  wearing: Record<string, string>; // 탭별로 고른 파츠
  objects: string[]; // 가진 방 오브젝트
  room: Record<string, string>; // 슬롯 → 오브젝트
  rewards: string[]; // 받은 월간 보상
  drinks: number; // 카페에서 주문한 잔 수
  roomLooks: string[]; // 가진 방 스타일
  roomLook: string; // 지금 방 스타일
}

const KEY = 'wallet';
// 처음부터 쓸 수 있는 Cloudee(기본 4명), 무료 오브젝트
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
// 이전 버전에서 이미 고른 캐릭터는 그대로 쓸 수 있게 한다
const current = loadValue<CharacterId | null>('character', null);
if (current && !state.cloudees.includes(current)) state = { ...state, cloudees: [...state.cloudees, current] };
// 기본 캐릭터 4명은 누구나 고를 수 있다(잠금은 프리미엄 Cloudy뿐)
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

// 코인이 모자라면 false
export function spend(n: number) {
  if (state.coins < n) return false;
  set({ coins: state.coins - n });
  return true;
}

// 오늘 첫 세션을 끝냈을 때: 오늘 도장을 "받기" 상태로 만든다(코인은 상점에서 도장을 찍을 때 받는다). 새로 켜졌으면 true
export function markStampReady() {
  if (state.lastStamp === today() || state.stampReady === today()) return false;
  set({ stampReady: today(), stampCount: state.stampCount >= STAMP_REWARDS.free.length ? 0 : state.stampCount });
  return true;
}
export const stampedToday = (w: Wallet) => w.lastStamp === today();
export const stampPending = (w: Wallet) => w.stampReady === today() && w.lastStamp !== today();

// 상점에서 오늘 도장 받기. 받은 코인(없으면 0)
export function claimStamp() {
  if (!stampPending(state)) return 0;
  const i = Math.min(state.stampCount, STAMP_REWARDS.free.length - 1);
  const gain = STAMP_REWARDS[state.plan][i];
  set({ coins: state.coins + gain, stampCount: state.stampCount + 1, lastStamp: today(), stampReady: null });
  return gain;
}

export const setPlan = (plan: Plan) => set({ plan });
export const demoTopUp = () => earn(DEMO_TOPUP);

// 이 Cloudee를 쓸 수 있는지: 프리미엄(Cloudy)은 Pro 플랜이면, 나머지는 해제한 목록에 있으면
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

// 월간 보상 받기(Pro, 해당 일수 이상 공부했을 때)
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
