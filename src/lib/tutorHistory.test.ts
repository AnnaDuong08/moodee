// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest';
import { createConversation, readHistory, writeConversation, deleteConversation, clearHistory } from './tutorHistory';

beforeEach(() => localStorage.clear());
it('keeps device history private to its account and supports deletion', () => {
  const c = createConversation('Biology');
  c.messages.push({ role: 'user', text: 'Explain cells' });
  expect(writeConversation('alice', c).persistent).toBe(true);
  expect(readHistory('alice')[0].messages[0].text).toBe('Explain cells');
  expect(readHistory('bob')).toEqual([]);
  deleteConversation('alice', c.id);
  expect(readHistory('alice')).toEqual([]);
});
it('evicts older conversations and clears all history', () => {
  for (let n = 0; n < 22; n++) writeConversation('alice', { ...createConversation(String(n)), updatedAt: n });
  expect(readHistory('alice')).toHaveLength(20);
  expect(readHistory('alice').some(c => c.topic === '0')).toBe(false);
  clearHistory('alice');
  expect(readHistory('alice')).toEqual([]);
});
it('keeps conversations in memory if storage writes fail', () => {
  const broken = { getItem: () => null, setItem: () => { throw new Error('blocked'); }, removeItem: () => {} };
  const c = createConversation('Math');
  expect(writeConversation('blocked-user', c, broken).persistent).toBe(false);
  expect(readHistory('blocked-user', broken)[0].id).toBe(c.id);
});
it('observes browser data removal instead of showing stale in-memory history', () => {
  writeConversation('removed-data', createConversation('Physics'));
  localStorage.clear();
  expect(readHistory('removed-data')).toEqual([]);
});
it('evicts data beyond two megabytes while keeping the newest conversation', () => {
  for(let n=0;n<20;n++)writeConversation('large', {...createConversation(String(n)),notes:'a'.repeat(8000),messages:Array.from({length:30},()=>({role:'user' as const,text:'a'.repeat(4000)})),updatedAt:n});
  expect(JSON.stringify(readHistory('large')).length*2).toBeLessThanOrEqual(2*1024*1024);
  expect(readHistory('large')[0].topic).toBe('19');
});
it('does not resurrect deleted history when device removal fails', () => {
  let saved:string|null=null;
  const storage={getItem:()=>saved,setItem:(k:string,v:string)=>{void k;saved=v;},removeItem:()=>{throw new Error('blocked');}};
  const c=createConversation('Chemistry');writeConversation('failed-delete',c,storage);
  storage.setItem=()=>{throw new Error('blocked');};
  deleteConversation('failed-delete',c.id,storage);
  expect(readHistory('failed-delete',storage)).toEqual([]);
  clearHistory('failed-delete',storage);
  expect(readHistory('failed-delete',storage)).toEqual([]);
});
