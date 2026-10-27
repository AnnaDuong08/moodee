// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('./auth',()=>({authConfigured:true,supabaseUrl:'https://test.supabase.co',supabasePublicKey:'public',tutorIdentity:async()=>({access_token:'supabase-jwt',user:{id:'alice'}})}));
import { callTutor } from './tutorClient';
afterEach(()=>vi.unstubAllGlobals());
it('keeps the sent context within the server limit and excludes browser role injection',async()=>{
  let body:Record<string,unknown>={};
  vi.stubGlobal('fetch',async(_url:unknown,init:RequestInit)=>{body=JSON.parse(String(init.body));return new Response(JSON.stringify({text:'Answer'}));});
  await callTutor('ask',{question:'Why?',topic:'Cells',notes:'a'.repeat(8000),messages:Array.from({length:8},(_,n)=>({role:'user',text:String(n)+'a'.repeat(3999)}))});
  const serialized=body.messages as {text:string}[];
  expect(serialized.reduce((n,m)=>n+m.text.length,8008)).toBeLessThanOrEqual(20000);
  expect(serialized[serialized.length-1]?.text.startsWith('7')).toBe(true);
});
it('preserves usage details on quota errors and makes no automatic retry',async()=>{
  let calls=0;
  vi.stubGlobal('fetch',async()=>{calls++;return new Response(JSON.stringify({error:'Limit reached',code:'quota',usage:{remaining:0}}),{status:429});});
  await expect(callTutor('ask',{question:'Why?'})).rejects.toMatchObject({code:'quota',usage:{remaining:0}});
  expect(calls).toBe(1);
});
