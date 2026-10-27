import { normalizeTutorInput, TutorError } from './tutor-api.ts';
import type { TutorInput, TutorResult, TutorUsage } from './tutor-contract.ts';
interface Dependencies {
  origins: string[]; configured: boolean;
  user: (token: string) => Promise<{id:string;anonymous:boolean} | null>;
  quota: (id: string, anonymous: boolean, reserve: boolean) => Promise<{allowed:boolean;usage:TutorUsage;code?:string}>;
  answer: (input: TutorInput) => Promise<TutorResult>;
}
export function tutorHandler(deps: Dependencies) {
  return async (request: Request): Promise<Response> => {
    const origin=request.headers.get('Origin');
    const approved=Boolean(origin && deps.origins.includes(origin));
    const headers: Record<string,string> = {'Content-Type':'application/json','Cache-Control':'no-store',Vary:'Origin',
      ...(approved?{'Access-Control-Allow-Origin':origin!,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'}:{})};
    const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
    if (request.method==='OPTIONS') return new Response(null,{status:approved?204:403,headers});
    if (request.method!=='POST' || (origin && !approved)) return reply({error:'Forbidden',code:'forbidden'},403);
    if (!deps.configured) return reply({error:'Tutor unavailable. Configuration is not ready.',code:'unavailable'},503);
    try {
      const token=request.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
      const user=token?await deps.user(token):null;
      if (!user) return reply({error:'Tutor access expired. Please reconnect.',code:'auth'},401);
      // Reject oversized bodies before parsing. Content-Length alone is not trustworthy.
      const reader=request.body?.getReader();
      let bytes=0; const chunks:Uint8Array[]=[];
      if (reader) while(true) { const {done,value}=await reader.read(); if(done) break; bytes+=value.byteLength; if(bytes>120000){await reader.cancel();throw new TutorError('Request is too large.');} chunks.push(value); }
      const buffer=new Uint8Array(bytes); let offset=0; for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.length;}
      let body:Record<string,unknown>;
      try { body=JSON.parse(new TextDecoder().decode(buffer)); } catch { throw new TutorError('Invalid request.'); }
      if (!body || typeof body!=='object' || Array.isArray(body)) throw new TutorError('Invalid request.');
      const input=body.action==='status'?null:normalizeTutorInput(body);
      const quota=await deps.quota(user.id,user.anonymous,input!==null);
      if (!input) return reply({usage:quota.usage});
      if (!quota.allowed) return reply({error:quota.code==='burst'?'Please wait a minute before asking again.':'Today’s Tutor limit has been reached. Try again after the reset.',code:quota.code??'quota',usage:quota.usage},429);
      try { return reply({...await deps.answer(input),usage:quota.usage}); }
      catch(error) { if(error instanceof TutorError) return reply({error:error.message,code:error.code,usage:quota.usage},error.status); throw error; }
    } catch(error) {
      if(error instanceof TutorError) return reply({error:error.message,code:error.code},error.status);
      return reply({error:'Tutor unavailable. Please try again later.',code:'unavailable'},503);
    }
  };
}
