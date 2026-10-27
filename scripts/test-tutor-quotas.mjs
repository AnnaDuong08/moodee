// Run only against an isolated local PostgreSQL database with the Tutor migration applied.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import assert from 'node:assert/strict';
const run=promisify(execFile);
const db=process.argv[2]??'postgresql://postgres@127.0.0.1:55432/postgres';
if(!['127.0.0.1','localhost'].includes(new URL(db).hostname))throw new Error('Quota tests require an isolated local database.');
const sql=async text=>(await run('psql',['-w',db,'-v','ON_ERROR_STOP=1','-At','-c',text])).stdout.trim();
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const call=async(n,guest=true,reserve=true)=>JSON.parse((await sql(`set role service_role;select public.tutor_usage('${id(n)}',${guest},${reserve});`)).split('\n').at(-1));
await sql('truncate private.tutor_usage_daily');
const burst=await Promise.all(Array.from({length:12},()=>call(1)));
assert.equal(burst.filter(x=>x.allowed).length,3,'Rolling burst must not exceed three under concurrency');
assert.equal((await call(1,true,false)).usage.used,3,'Status must not spend quota');
await sql(`update private.tutor_usage_daily set used=9,recent='{}' where bucket='user:${id(1)}'`);
const guest=await Promise.all(Array.from({length:12},()=>call(1)));
assert.equal(guest.filter(x=>x.allowed).length,1,'Guest cap must remain ten under concurrency');
assert.equal((await call(1,true,false)).usage.used,10);
await call(2,false,false);
await sql(`update private.tutor_usage_daily set used=29 where bucket='user:${id(2)}'`);
const account=await Promise.all(Array.from({length:12},()=>call(2,false)));
assert.equal(account.filter(x=>x.allowed).length,1,'Account cap must remain thirty');
await sql("update private.tutor_usage_daily set used=299 where bucket='global'");
const global=await Promise.all(Array.from({length:12},(_,n)=>call(n+10)));
assert.equal(global.filter(x=>x.allowed).length,1,'Global cap must remain 300 across accounts');
const status=await call(1,true,false);
assert.equal(status.usage.globalUsed,300);
assert.equal(status.usage.remaining,0);
assert.equal(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jakarta',hour:'2-digit',minute:'2-digit'}).format(new Date(status.usage.resetsAt)),'00:00');
for(const role of ['anon','authenticated']){
  await assert.rejects(sql(`set role ${role};select * from private.tutor_usage_daily`));
  await assert.rejects(sql(`set role ${role};select public.tutor_usage('${id(1)}',false,true)`));
}
console.log('Tutor quota integration: burst, guest, account, global concurrency, Jakarta reset and client isolation passed.');
