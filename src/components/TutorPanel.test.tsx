// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
// jsdom has no layout engine; browser scroll sizing is checked visually.
beforeAll(()=>vi.stubGlobal('ResizeObserver',class {observe(){} unobserve(){} disconnect(){}}));
afterAll(()=>vi.unstubAllGlobals());
const auth=vi.hoisted(()=>({user:{id:'alice',is_anonymous:false},hasSession:true,pending:null as Promise<{text:string}>|null}));
vi.mock('../lib/auth',()=>({supabase:{auth:{getSession:async()=>({data:{session:auth.hasSession?auth:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe:()=>{}}}})}},beginGoogleOAuth:vi.fn()}));
vi.mock('../lib/tutorClient',()=>({TutorRequestError:class extends Error {},tutorConfigured:true,callTutor:async(action:string)=> action==='status'?{usage:{used:0,limit:30,remaining:30,globalUsed:0,globalLimit:300,resetsAt:'2026-10-01T17:00:00Z'}}:action==='ask'?(auth.pending??{text:'Cells are the building blocks of life.'}):{quiz:{questions:[0,1,2].map(n=>({question:`Question ${n+1}`,choices:['A','B','C','D'],correctIndex:n,explanation:'Explanation',topic:'Cells'}))}}}));
import { TutorPanel } from './TutorPanel';
afterEach(()=>{cleanup();localStorage.clear();auth.pending=null;auth.hasSession=true;});
const open=()=>render(<TutorPanel open onClose={()=>{}} goal="Biology" session={null} onPause={()=>{}} />);
it('renders Tutor Markdown as readable headings, lists, code and tables',async()=>{
  auth.pending=Promise.resolve({text:'## Cell basics\n\n**Cells** use `ATP` for energy.\n\n- Read the chapter\n- Try an example\n\n```js\nconst energy = "ATP";\n```\n\n| Part | Role |\n| --- | --- |\n| Nucleus | DNA |'});
  open();await screen.findByText('30 requests left today');
  fireEvent.change(screen.getByRole('textbox',{name:'Your question'}),{target:{value:'Explain cells'}});
  fireEvent.click(screen.getByRole('button',{name:'Send question'}));
  const log=screen.getByRole('log',{name:'Tutor conversation'});
  await within(log).findByRole('heading',{name:'Cell basics'});
  expect(within(log).getByText('Cells').tagName).toBe('STRONG');
  expect(within(log).getAllByRole('listitem')).toHaveLength(2);
  expect(within(log).getByText('const energy = "ATP";').tagName).toBe('CODE');
  expect(within(log).getByRole('table').textContent).toContain('Nucleus');
});
it('keeps model HTML, unsafe links and remote images inert',async()=>{
  auth.pending=Promise.resolve({text:'Useful [reference](https://example.com/lesson). [unsafe](javascript:alert(1))\n\n<img src="https://example.com/track" onerror="alert(1)">\n\n![Diagram](https://example.com/diagram.png)'});
  open();await screen.findByText('30 requests left today');
  fireEvent.change(screen.getByRole('textbox',{name:'Your question'}),{target:{value:'Show a reference'}});
  fireEvent.click(screen.getByRole('button',{name:'Send question'}));
  const log=screen.getByRole('log',{name:'Tutor conversation'});
  const link=await within(log).findByRole('link',{name:'reference'});
  expect(link.getAttribute('href')).toBe('https://example.com/lesson');
  expect(link.getAttribute('rel')).toContain('noopener');
  expect(log.querySelector('img, script, [onerror], a[href^="javascript:"]')).toBeNull();
  expect(within(log).getByText('Diagram')).toBeTruthy();
});
it('allows guests to send immediately without login or CAPTCHA and retains failed drafts',async()=>{
  auth.hasSession=false;
  open();
  const input=screen.getByRole('textbox',{name:'Your question'});
  fireEvent.change(input,{target:{value:'Why do cells divide?'}});
  expect(screen.getByRole('button',{name:'Send question'}).hasAttribute('disabled')).toBe(false);
  auth.pending=Promise.reject(new Error('Guest access unavailable. Please try again.'));
  fireEvent.click(screen.getByRole('button',{name:'Send question'}));
  await screen.findByRole('alert');
  expect((input as HTMLTextAreaElement).value).toBe('Why do cells divide?');
  expect(screen.getByRole('button',{name:'Send question'}).hasAttribute('disabled')).toBe(false);
});
it('answers questions and reloads device history without pausing the session',async()=>{
  open(); await screen.findByText('30 requests left today');
  fireEvent.change(screen.getByRole('textbox',{name:'Your question'}),{target:{value:'What is a cell?'}});
  fireEvent.click(screen.getByRole('button',{name:'Send question'}));
  await screen.findByText('Cells are the building blocks of life.');
  fireEvent.click(screen.getByRole('tab',{name:'History'}));
  expect(await screen.findByRole('button',{name:/Continue Biology/})).toBeTruthy();
});
it('keeps quiz progress when an Ask response arrives after switching tabs',async()=>{
  open();await screen.findByText('30 requests left today');
  fireEvent.click(screen.getByRole('tab',{name:'Quiz me'}));fireEvent.click(screen.getByRole('button',{name:'Generate quiz'}));await screen.findByText('Question 1');
  let resolve!:(value:{text:string})=>void;auth.pending=new Promise(r=>{resolve=r;});
  fireEvent.click(screen.getByRole('tab',{name:'Ask'}));fireEvent.change(screen.getByRole('textbox',{name:'Your question'}),{target:{value:'Help with this quiz'}});fireEvent.click(screen.getByRole('button',{name:'Send question'}));
  fireEvent.click(screen.getByRole('tab',{name:'Quiz me'}));fireEvent.click(within(screen.getByRole('group',{name:'Answer choices'})).getAllByRole('button')[0]);fireEvent.click(screen.getByRole('button',{name:'Next question'}));
  resolve({text:'A useful hint'});
  await waitFor(()=>expect(screen.getByText('Question 2')).toBeTruthy());
  fireEvent.click(screen.getByRole('tab',{name:'Ask'}));await screen.findByText('A useful hint');
  fireEvent.click(screen.getByRole('tab',{name:'Quiz me'}));expect(screen.getByText('Question 2')).toBeTruthy();
});
it('completes a three-question quiz and prevents changing a confirmed answer',async()=>{
  open(); await screen.findByText('30 requests left today');
  fireEvent.click(screen.getByRole('tab',{name:'Quiz me'}));
  fireEvent.click(screen.getByRole('button',{name:'Generate quiz'}));
  await screen.findByText('Question 1');
  for(let n=0;n<3;n++){
    const choices=within(screen.getByRole('group',{name:'Answer choices'})).getAllByRole('button');
    fireEvent.click(choices[n]);
    expect(choices[0].hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button',{name:n===2?'See recap':'Next question'}));
  }
  await waitFor(()=>expect(screen.getByText('3 of 3 correct')).toBeTruthy());
});
