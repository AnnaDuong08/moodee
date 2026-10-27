import { expect, it } from 'vitest';
import { tutorHandler } from './tutor-handler';
const usage = {used:1,limit:10,globalUsed:1,globalLimit:300,remaining:9,resetsAt:'2026-10-01T17:00:00Z'};
const request = (body: unknown, token='jwt') => new Request('https://backend/tutor', {method:'POST', headers:{Origin:'https://app.test',Authorization:`Bearer ${token}`},body:JSON.stringify(body)});
it('requires a verified user and does not call OpenAI for invalid inputs', async () => {
  let sent = 0;
  const deps = {origins:['https://app.test'],configured:true,user:async()=>null,quota:async()=>({allowed:true,usage}),answer:async()=>{sent++;return {text:'Answer'};}};
  const handler = tutorHandler(deps);
  expect((await handler(request({action:'ask',question:'Hi'}))).status).toBe(401);
  const authed = tutorHandler({...deps,user:async()=>({id:'guest',anonymous:true})});
  expect((await authed(request({action:'ask',question:''}))).status).toBe(400);
  expect(sent).toBe(0);
});
it('reserves verified identity quota before dispatch and returns safe usage metadata', async () => {
  const steps: string[] = [];
  const handler = tutorHandler({origins:['https://app.test'],configured:true,user:async()=>({id:'real-user',anonymous:true}),quota:async(id, anon, reserve)=>{steps.push(`${id}:${anon}:${reserve}`);return {allowed:true,usage};},answer:async()=>{steps.push('openai');return {text:'Answer'};}});
  const response = await handler(request({action:'ask',question:'Explain',userId:'attacker',anonymous:false}));
  expect(await response.json()).toEqual({text:'Answer',usage});
  expect(steps).toEqual(['real-user:true:true','openai']);
});
it('does not spend on status, missing configuration or quota exhaustion', async () => {
  let sent=0;
  const base = {origins:['https://app.test'],configured:true,user:async()=>({id:'guest',anonymous:true}),quota:async()=>({allowed:false,usage}),answer:async()=>{sent++;return {text:'x'};}};
  const response = await tutorHandler(base)(request({action:'ask',question:'Explain'}));
  expect(response.status).toBe(429);
  expect((await tutorHandler(base)(request({action:'status'}))).status).toBe(200);
  expect((await tutorHandler({...base,configured:false})(request({action:'ask',question:'Explain'}))).status).toBe(503);
  expect(sent).toBe(0);
});
it('redacts backend errors and rejects unapproved origins', async () => {
  const handler=tutorHandler({origins:['https://app.test'],configured:true,user:async()=>{throw new Error('secret-key');},quota:async()=>({allowed:true,usage}),answer:async()=>({text:'x'})});
  const response=await handler(request({action:'status'}));
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain('secret-key');
  expect((await handler(new Request('https://backend/tutor',{method:'OPTIONS',headers:{Origin:'https://bad.test'}}))).status).toBe(403);
});
