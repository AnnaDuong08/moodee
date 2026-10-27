import { authConfigured, supabaseUrl, supabasePublicKey, tutorIdentity } from './auth';
import type { TutorResult, TutorUsage } from '../../supabase/functions/_shared/tutor-contract';
export const tutorConfigured = authConfigured;
export class TutorRequestError extends Error {
  constructor(message: string, public code = 'unavailable', public usage?: TutorUsage) { super(message); }
}
export async function callTutor(action: 'status' | 'ask' | 'quiz', data: Record<string,unknown> = {}, signal?: AbortSignal): Promise<TutorResult> {
  const messages: {role:'user'|'assistant';text:string}[]=[];
  let size=String(data.question??'').length+String(data.topic??'').length+String(data.notes??'').length;
  const history=Array.isArray(data.messages)?data.messages:[];
  for(const m of history.slice(-8).reverse()) {
    if(!m || (m.role!=='user' && m.role!=='assistant') || typeof m.text!=='string') continue;
    if(size+m.text.length>20000) break;
    messages.unshift({role:m.role,text:m.text});size+=m.text.length;
  }
  data={...data,messages};
  const session = await tutorIdentity();
  const controller=new AbortController();
  const abort=()=>controller.abort(); signal?.addEventListener('abort',abort,{once:true});
  if(signal?.aborted) controller.abort();
  const timeout=window.setTimeout(abort,45000);
  try {
    const response=await fetch(`${supabaseUrl}/functions/v1/tutor`,{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,apikey:supabasePublicKey,'Content-Type':'application/json'},body:JSON.stringify({...data,action}),signal:controller.signal});
    const result=await response.json().catch(()=>null) as TutorResult & {error?:string;code?:string} | null;
    if(!response.ok || !result) throw new TutorRequestError(result?.error??'Tutor unavailable. Please try again later.',result?.code??'unavailable',result?.usage);
    return result;
  } catch(error) {
    if(error instanceof TutorRequestError) throw error;
    throw new TutorRequestError(controller.signal.aborted?'Tutor could not respond in time. Please try again.':'You appear to be offline. Your draft is still here.',controller.signal.aborted?'timeout':'offline');
  } finally {window.clearTimeout(timeout);signal?.removeEventListener('abort',abort);}
}
