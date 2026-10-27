// Museum exhibit: a moment worth keeping → memory object → story → exhibit
import { loadValue, save } from './storage';

export interface Memory {
  id: string;
  moment: string; // The chosen moment (a session or typed in)
  objectId: string; // Memory object (id in EXHIBIT_OBJECTS)
  photo?: string; // Photo taken
  story: string;
  sourceType?: 'demo-video' | 'camera' | 'photo';
  createdAt: string;
}

const KEY = 'memories';
export const listMemories = () => loadValue<Memory[]>(KEY, []);
export function addMemory(m: Omit<Memory, 'id' | 'createdAt'>) {
  const memory: Memory = { ...m, id: `${Date.now()}`, createdAt: new Date().toISOString() };
  save(KEY, [memory, ...listMemories()]);
  return memory;
}
