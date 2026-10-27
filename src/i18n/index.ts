// App language: one setting for the whole app (picked on Home, remembered in localStorage)
// UI text is written in English in the code and looked up by that English text; missing translations fall back to English
import { Children, useSyncExternalStore, type ReactNode } from 'react';
import { loadValue, save } from '../lib/storage';
import { ja } from './ja';
import { ko } from './ko';
import { vi } from './vi';

export type Lang = 'en' | 'ko' | 'ja' | 'vi';

export const LANGS: { id: Lang; short: string; label: string }[] = [
  { id: 'en', short: 'EN', label: 'English' },
  { id: 'ko', short: '한', label: '한국어' },
  { id: 'ja', short: '日', label: '日本語' },
  { id: 'vi', short: 'VI', label: 'Tiếng Việt' },
];

const DICT: Record<Exclude<Lang, 'en'>, Record<string, string>> = { ko, ja, vi };

const KEY = 'lang';
const saved = loadValue<string>(KEY, 'en');
let lang: Lang = LANGS.some((l) => l.id === saved) ? (saved as Lang) : 'en';
const listeners = new Set<() => void>();
if (typeof document !== 'undefined') document.documentElement.lang = lang;

export const getLang = () => lang;
export function setLang(next: Lang) {
  lang = next;
  save(KEY, next);
  document.documentElement.lang = next;
  listeners.forEach((fn) => fn());
}
export function useLang() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
    () => lang,
  );
}

// "Going to {place}…" + { place: 'Café' } → "카페로 가는 중…"
export function translate(l: Lang, text: string, vars: Record<string, string | number> = {}) {
  const s = l === 'en' ? text : (DICT[l][text] ?? text);
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}
export const tr = (text: string, vars?: Record<string, string | number>) => translate(lang, text, vars);

// In components: const t = useT(); t('Go to {place}', { place: t(place.name) })
export function useT() {
  const l = useLang();
  return (text: string, vars?: Record<string, string | number>) => translate(l, text, vars);
}

// For text with markup inside: tRich('Good evening, {name}', { name: <b>Nier</b> })
export function useTRich() {
  const l = useLang();
  return (text: string, vars: Record<string, ReactNode>) =>
    Children.toArray(translate(l, text).split(/(\{\w+\})/).map((part) => {
      const k = /^\{(\w+)\}$/.exec(part)?.[1];
      return k && k in vars ? vars[k] : part;
    }));
}
