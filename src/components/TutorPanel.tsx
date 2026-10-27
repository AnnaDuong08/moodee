import { useEffect, useRef, useState } from 'react';
import { beginGoogleOAuth, supabase } from '../lib/auth';
import { callTutor, tutorConfigured, TutorRequestError } from '../lib/tutorClient';
import { clearHistory, createConversation, deleteConversation, readHistory, writeConversation, type TutorConversation, type TutorUsage } from '../lib/tutorHistory';
import { formatCountdown, type FocusSession } from '../lib/focusSession';
import { useLang, useT } from '../i18n';
import { Sheet } from './Sheet';
import { ScrollArea } from './ScrollArea';
import { TutorMarkdown } from './TutorMarkdown';
import styles from './TutorPanel.module.css';

interface Props {open:boolean;onClose:()=>void;goal:string;session:FocusSession|null;onPause:()=>void;resetRevision?:number;initialMessage?:string}
type Tab='Ask'|'Quiz me'|'History';
export function TutorPanel({open,onClose,goal,session,onPause,resetRevision=0,initialMessage=''}:Props) {
  const [tab,setTab]=useState<Tab>('Ask');
  const tx=useT();const lang=useLang();
  const [conversation,setConversation]=useState<TutorConversation>(()=>createConversation(goal));
  const current=useRef(conversation);current.current=conversation;
  const [draft,setDraft]=useState('');const [busy,setBusy]=useState(false);const busyRef=useRef(false);
  const [owner,setOwner]=useState<string|null>(null);const ownerRef=useRef<string|null>(null);
  const [guest,setGuest]=useState(true);const [usage,setUsage]=useState<TutorUsage|null>(null);
  const [message,setMessage]=useState(initialMessage);const [persistent,setPersistent]=useState(true);
  const [history,setHistory]=useState<TutorConversation[]>([]);const [confirmClear,setConfirmClear]=useState(false);
  const request=useRef<AbortController|null>(null);const box=useRef<HTMLDivElement>(null);
  const list=useRef<HTMLDivElement>(null);
  const assignIdentity=(id:string|null,isGuest:boolean)=>{
    if(ownerRef.current!==id){
      if(ownerRef.current) request.current?.abort();setUsage(null);
      if(ownerRef.current){setConversation(createConversation(goal));setDraft('');setMessage('');}
      ownerRef.current=id;setOwner(id);setHistory(id?readHistory(id):[]);
    }
    setGuest(isGuest);
  };
  useEffect(()=>{
    if(!supabase)return;
    let live=true;
    void supabase.auth.getSession().then(({data})=>{if(live)assignIdentity(data.session?.user.id??null,data.session?.user.is_anonymous!==false);});
    const {data}=supabase.auth.onAuthStateChange((_event,next)=>{if(live)assignIdentity(next?.user.id??null,next?.user.is_anonymous!==false);});
    return()=>{live=false;request.current?.abort();data.subscription.unsubscribe();};
  },[]);
  useEffect(()=>{if(!current.current.messages.length && !current.current.quiz)setConversation(c=>({...c,topic:goal.slice(0,300)}));},[goal]);
  const commit=(c:TutorConversation)=>{
    c={...c,updatedAt:Date.now()};current.current=c;setConversation(c);
    if(ownerRef.current && (c.messages.length || c.quiz)){setPersistent(writeConversation(ownerRef.current,c).persistent);setHistory(readHistory(ownerRef.current));}
  };
  useEffect(()=>{if(resetRevision){request.current?.abort();commit(current.current);setConversation(createConversation(goal));setDraft('');setTab('Ask');}},[resetRevision]);
  useEffect(()=>{
    if(!open || !owner || !tutorConfigured)return;
    let live=true;
    void callTutor('status').then(r=>{if(live && r.usage)setUsage(r.usage);}).catch(e=>{if(live)setMessage(e instanceof Error?e.message:tx('Tutor unavailable'));});
    return()=>{live=false;};
  },[open,owner]);
  useEffect(()=>{
    if(!open)return;
    const el=box.current;const vv=window.visualViewport;if(!el)return;
    const update=()=>{el.style.setProperty('--tutor-vv-h',`${vv?.height??window.innerHeight}px`);el.style.setProperty('--tutor-vv-top',`${vv?.offsetTop??0}px`);};
    update();vv?.addEventListener('resize',update);vv?.addEventListener('scroll',update);
    return()=>{vv?.removeEventListener('resize',update);vv?.removeEventListener('scroll',update);};
  },[open]);
  useEffect(()=>{list.current?.scrollTo?.({top:list.current.scrollHeight});},[conversation.messages.length,busy]);
  const run=async(action:'ask'|'quiz')=>{
    if(busyRef.current)return;
    if(action==='ask' && !draft.trim() || action==='quiz' && !conversation.topic.trim())return;
    busyRef.current=true;setBusy(true);setMessage('');
    const controller=new AbortController();request.current=controller;
    const snapshot=current.current;const question=draft.trim();
    try {
      const response=await callTutor(action,{question,topic:snapshot.topic,notes:snapshot.notes,messages:snapshot.messages.slice(-8)},controller.signal);
      if(controller.signal.aborted)return;
      if(!ownerRef.current){const {data}=await supabase!.auth.getSession();assignIdentity(data.session?.user.id??null,data.session?.user.is_anonymous!==false);}
      if(response.usage)setUsage(response.usage);
      if(action==='ask' && response.text){commit({...current.current,messages:[...current.current.messages,{role:'user',text:question},{role:'assistant',text:response.text}]});setDraft('');}
      if(action==='quiz' && response.quiz){commit({...snapshot,quiz:response.quiz,answers:[],quizIndex:0});}
    }catch(e){if(!controller.signal.aborted){setMessage(e instanceof Error?e.message:tx('Tutor unavailable. Please try again.'));if(e instanceof TutorRequestError && e.usage)setUsage(e.usage);}}
    finally{busyRef.current=false;setBusy(false);request.current=null;}
  };
  const blocked=!tutorConfigured || busy || usage?.remaining===0;
  const question=conversation.quiz?.questions[conversation.quizIndex];
  const chosen=conversation.answers[conversation.quizIndex];
  const recap=Boolean(conversation.quiz && conversation.quizIndex>=3);
  const newConversation=()=>{if(busy)return;setConversation(createConversation(goal));setDraft('');setMessage('');setTab('Ask');};
  return <div ref={box} className={styles.viewport}>
    <Sheet open={open} onClose={onClose} title={tx('Tutor')} subtitle={tx('A little help for your next step.')} action={<button className={styles.close} type="button" onClick={onClose} aria-label={tx('Close Tutor')}>×</button>}>
      <ScrollArea className={styles.body} aria-label={tx('Tutor panel content')}>
        <div className={styles.session}><span>{session?`${tx(session.stage==='focus'?'Focus':'Break')} · ${formatCountdown(session.remainingMs)}`:tx('Before your session')}</span>{session?.stage==='focus' && <button type="button" onClick={onPause}>{tx(session.status==='paused'?'Resume timer':'Pause timer')}</button>}</div>
        <div className={styles.tabs} role="tablist" aria-label={tx('Tutor modes')}>{(['Ask','Quiz me','History'] as Tab[]).map(t=><button type="button" key={t} role="tab" aria-selected={tab===t} onClick={()=>{setTab(t);setConfirmClear(false);}}>{tx(t)}</button>)}</div>
        <p className={styles.notice}>{tx('Your questions are sent to AI. Answers can be mistaken. History stays on this device.')}</p>
        {!persistent && <p role="status" className={styles.notice}>{tx('History could not be saved. It will stay here until this page closes.')}</p>}
        {!tutorConfigured && <p role="status">{tx('Tutor unavailable. Setup is not ready yet.')}</p>}
        {usage && <p className={styles.usage}>{tx('{n} requests left today',{n:usage.remaining})} <span>· {tx('resets {time}',{time:new Date(usage.resetsAt).toLocaleTimeString(lang,{hour:'2-digit',minute:'2-digit'})})}</span></p>}
        {message && <p role="alert" className={styles.error}>{message}</p>}
        {tab==='History'?<section aria-label={tx('Tutor history')} className={styles.history}>
          <div className={styles.historyHead}><b>{tx('On this device')}</b><button type="button" onClick={()=>setConfirmClear(true)} disabled={!history.length || busy}>{tx('Clear history')}</button></div>
          {confirmClear && <div className={styles.confirm}><p>{tx('Delete all Tutor history for this account on this device?')}</p><button type="button" onClick={()=>setConfirmClear(false)}>{tx('Keep history')}</button><button type="button" onClick={()=>{const saved=owner?clearHistory(owner):false;setHistory([]);newConversation();setConfirmClear(false);if(!saved){setPersistent(false);setMessage(tx('History was removed from this page, but saved browser data could not be deleted. Clear site data in your browser to remove it permanently.'));}}}>{tx('Delete all history')}</button></div>}
          {!history.length && <p className={styles.empty}>{tx('Your conversations and quizzes will find a home here.')}</p>}
          {history.map(c=><article key={c.id}><button type="button" disabled={busy} aria-label={tx('Continue {topic}',{topic:c.topic||tx('Study conversation')})} onClick={()=>{setConversation(c);setDraft('');setTab(c.quiz?'Quiz me':'Ask');setMessage('');}}><b>{c.topic||tx('Study conversation')}</b><small>{new Date(c.updatedAt).toLocaleDateString(lang)} · {tx('{n} replies',{n:c.messages.length/2})}{c.quiz?` · ${tx('Quiz')}`:''}</small></button><button type="button" disabled={busy} aria-label={tx('Delete {topic}',{topic:c.topic||tx('Study conversation')})} onClick={()=>{const saved=owner?deleteConversation(owner,c.id):false;setHistory(owner?readHistory(owner):[]);if(conversation.id===c.id)newConversation();if(!saved){setPersistent(false);setMessage(tx('History was removed from this page, but saved browser data could not be deleted. Clear site data in your browser to remove it permanently.'));}}}>{tx('Delete')}</button></article>)}
        </section>:<>
          <label className={styles.label}>{tx('Study topic')}<input aria-label={tx('Study topic')} value={conversation.topic} maxLength={300} disabled={busy || Boolean(conversation.quiz)} onChange={e=>setConversation(c=>({...c,topic:e.target.value}))} placeholder={tx('e.g. Cell biology')} /></label>
          {!conversation.quiz && <details className={styles.notes}><summary>{tx('Add study notes (optional)')}</summary><textarea aria-label={tx('Study notes')} maxLength={8000} value={conversation.notes} disabled={busy} onChange={e=>setConversation(c=>({...c,notes:e.target.value}))} placeholder={tx('Paste the material you want to discuss or practice.')} /><small>{conversation.notes.length}/8000</small></details>}
          {tab==='Ask'?<>
            {(conversation.messages.length > 0 || busy) && <ScrollArea ref={list} className={styles.messages} role="log" aria-label={tx('Tutor conversation')} aria-live="polite"><div className={styles.messageContent}>{conversation.messages.map((m,n)=><div key={n} className={m.role==='user'?styles.mine:styles.reply}><b className={styles.speaker}>{tx(m.role==='user'?'You':'Tutor')}</b>{m.role==='assistant'?<TutorMarkdown text={m.text}/>:<p className={styles.userText}>{m.text}</p>}</div>)}{busy && <p role="status">{tx('Tutor is thinking…')}</p>}</div></ScrollArea>}
            {!conversation.messages.length && <div className={styles.starters}>{['Explain a concept','Give an example','Help me understand'].map(s=><button type="button" key={s} disabled={busy} onClick={()=>setDraft(`${conversation.topic?tx(`${s} about {topic}`,{topic:conversation.topic}):tx(s)}: `)}>{tx(s)}</button>)}</div>}
            <form className={styles.composer} onSubmit={e=>{e.preventDefault();void run('ask');}}><textarea aria-label={tx('Your question')} value={draft} maxLength={4000} disabled={busy} onChange={e=>setDraft(e.target.value)} placeholder={tx('What would you like to understand?')} /><div><small>{draft.length}/4000</small><button type="submit" className="pill pill-primary" aria-label={tx('Send question')} disabled={blocked || !draft.trim()}>{tx('Send')}</button></div></form>
          </>:<section className={styles.quiz} aria-label={tx('Practice quiz')}>
            {!conversation.quiz && <><p>{tx('Confirm your topic, then try three questions. You will see an explanation after each answer.')}</p><button type="button" className="pill pill-primary" disabled={blocked || !conversation.topic.trim()} onClick={()=>void run('quiz')}>{tx(busy?'Making your quiz…':'Generate quiz')}</button></>}
            {question && <><span className={styles.eyebrow}>{tx('QUESTION {n} OF 3',{n:conversation.quizIndex+1})}</span><h3>{question.question}</h3><div role="group" aria-label={tx('Answer choices')} className={styles.choices}>{question.choices.map((choice,index)=><button type="button" key={index} disabled={chosen!==undefined} className={chosen===index?styles.selected:''} onClick={()=>commit({...conversation,answers:[...conversation.answers,index]})}>{choice}</button>)}</div>{chosen!==undefined && <div className={styles.feedback}><b>{tx(chosen===question.correctIndex?'That’s right':'Let’s look at this one')}</b><p>{question.explanation}</p><button type="button" className="pill pill-primary" onClick={()=>commit({...conversation,quizIndex:conversation.quizIndex+1})}>{tx(conversation.quizIndex===2?'See recap':'Next question')}</button></div>}</>}
            {recap && <><span className={styles.eyebrow}>{tx('YOUR PRACTICE RECAP')}</span><h3>{tx('{n} of 3 correct',{n:conversation.answers.filter((a,n)=>a===conversation.quiz!.questions[n].correctIndex).length})}</h3><p>{conversation.answers.every((a,n)=>a===conversation.quiz!.questions[n].correctIndex)?tx('You understood these ideas. Ready to try another topic?'):tx('Worth another look:')}</p><ul>{conversation.quiz!.questions.filter((q,n)=>conversation.answers[n]!==q.correctIndex).map((q,n)=><li key={n}>{q.topic}</li>)}</ul><button type="button" className="pill pill-primary" onClick={()=>{newConversation();setTab('Quiz me');}}>{tx('Try another quiz')}</button></>}
          </section>}
          <div className={styles.footer}><button type="button" onClick={newConversation} disabled={busy}>{tx('New conversation')}</button>{guest && <button type="button" disabled={Boolean(session) || busy || !tutorConfigured} onClick={()=>void beginGoogleOAuth('tutor').catch(e=>setMessage(e.message))}>{tx('Sign in with Google')}</button>}</div>
          {guest && session && <small className={styles.notice}>{tx('Google sign-in is available after this session ends.')}</small>}
        </>}
      </ScrollArea>
    </Sheet>
  </div>;
}
