// Thought notes: parked with "Park a thought" while focusing or written directly in the Library → stack up on the Library shelf
import { loadValue, save } from './storage';

export interface Thought {
  id: string;
  text: string;
  createdAt: string;
  from?: string; // e.g. "Classroom · Coding"
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
