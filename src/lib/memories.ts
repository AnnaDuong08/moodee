// 박물관 전시: 남기고 싶은 순간 → 기억 오브젝트 → 이야기 → 전시
import { loadValue, save } from './storage';

export interface Memory {
  id: string;
  moment: string; // 고른 순간(세션 또는 직접 입력)
  objectId: string; // 기억 오브젝트(EXHIBIT_OBJECTS의 id)
  photo?: string; // 찍은 사진
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
