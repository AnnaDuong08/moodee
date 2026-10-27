// 생각 메모: 집중 중 "Park a thought"로 내려놓거나 Library에서 직접 적는다 → Library 선반에 쌓임
import { loadValue, save } from './storage';

export interface Thought {
  id: string;
  text: string;
  createdAt: string;
  from?: string; // 예: "Classroom · Coding"
  done?: boolean;
  updatedAt?: string;
}

const KEY = 'thoughts';
export const listThoughts = () => loadValue<Thought[]>(KEY, []);

export function addThought(text: string, from?: string) {
  const t: Thought = { id: `${Date.now()}`, text: text.trim(), createdAt: new Date().toISOString(), from };
  save(KEY, [t, ...listThoughts()]);
  return t;
}
export const toggleThought = (id: string) => save(KEY, listThoughts().map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
export const removeThought = (id: string) => save(KEY, listThoughts().filter((t) => t.id !== id));
export const updateThought = (id: string, text: string) => save(KEY, listThoughts().map((t) => (t.id === id ? { ...t, text: text.trim(), updatedAt: new Date().toISOString() } : t)));
