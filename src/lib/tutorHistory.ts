import type { TutorConversation } from '../../supabase/functions/_shared/tutor-contract';
export type { TutorConversation, TutorMessage, TutorQuestion, TutorQuiz, TutorUsage } from '../../supabase/functions/_shared/tutor-contract';
type DeviceStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const memory = new Map<string, TutorConversation[]>();
const volatile = new Set<string>();
const key = (account: string) => `moodee:tutor:${account}`;
function deviceStorage(): DeviceStorage | undefined { try { return localStorage; } catch { return undefined; } }
export function createConversation(topic = ''): TutorConversation {
  return { id: crypto.randomUUID(), topic, notes: '', messages: [], answers: [], quizIndex: 0, updatedAt: Date.now() };
}
export function readHistory(account: string, storage = deviceStorage()): TutorConversation[] {
  if (volatile.has(account)) return structuredClone(memory.get(account) ?? []);
  try {
    const value = JSON.parse(storage?.getItem(key(account)) ?? '[]');
    if (Array.isArray(value)) return value.filter(c => c && typeof c.id === 'string' && typeof c.topic === 'string' && Array.isArray(c.messages) && Array.isArray(c.answers));
  } catch { return structuredClone(memory.get(account) ?? []); }
  return [];
}
export function writeConversation(account: string, conversation: TutorConversation, storage = deviceStorage()) {
  const history = [conversation, ...readHistory(account, storage).filter(c => c.id !== conversation.id)].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 20);
  // UTF-16 storage needs two bytes per code unit. Leave room for other MOODEE data.
  while (history.length && JSON.stringify(history).length * 2 > 2 * 1024 * 1024) history.pop();
  memory.set(account, structuredClone(history));
  try { if (!storage) throw new Error('Unavailable'); storage.setItem(key(account), JSON.stringify(history)); volatile.delete(account); return { persistent: true }; }
  catch { volatile.add(account); return { persistent: false }; }
}
export function deleteConversation(account: string, id: string, storage = deviceStorage()) {
  const history = readHistory(account, storage).filter(c => c.id !== id);
  memory.set(account, history);
  try { if(!storage)throw new Error('Unavailable');storage.setItem(key(account), JSON.stringify(history));volatile.delete(account);return true; }
  catch { volatile.add(account);return false; }
}
export function clearHistory(account: string, storage = deviceStorage()) {
  memory.set(account, []);
  try { if(!storage)throw new Error('Unavailable');storage.removeItem(key(account));volatile.delete(account);return true; }
  catch { volatile.add(account);return false; }
}
