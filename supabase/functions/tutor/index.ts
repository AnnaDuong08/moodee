import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import { OpenAITutor } from '../_shared/tutor-api.ts';
import { tutorHandler } from '../_shared/tutor-handler.ts';

const url=Deno.env.get('SUPABASE_URL');
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const openAIKey=Deno.env.get('OPENAI_API_KEY');
const admin=url && serviceKey?createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}}):null;
const ai=new OpenAITutor(openAIKey??'',Deno.env.get('OPENAI_TUTOR_MODEL')??'gpt-4.1-mini');
Deno.serve(tutorHandler({
  configured:Boolean(admin && openAIKey),
  origins:(Deno.env.get('APP_ORIGINS')??'').split(',').map(s=>s.trim()).filter(Boolean),
  user:async token=>{ const {data,error}=await admin!.auth.getUser(token); return error || !data.user?null:{id:data.user.id,anonymous:data.user.is_anonymous===true}; },
  quota:async(id,anonymous,reserve)=>{
    const {data,error}=await admin!.rpc('tutor_usage',{p_uid:id,p_anonymous:anonymous,p_reserve:reserve});
    if(error || !data) throw new Error('Quota unavailable');
    return data;
  },
  answer:input=>ai.request(input),
}));
