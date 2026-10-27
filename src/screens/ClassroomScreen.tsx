// 클래스룸 집중 루틴(포스트잇 피드백 반영):
// 자리 고르기 → 자리로 이동·앉기 → 소리 조절 → 시간 + "What are you studying?" → 집중 → 기록 저장
// 같은 방 친구들이 무엇을 공부 중인지는 이름표와 People 시트로 보인다(채팅 없음)
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { soundscape, type SoundId } from '../audio/soundscape';
import { useSoundscape } from '../audio/useSoundscape';
import { ClassroomHud } from '../components/ClassroomHud';
import { CountUp, Sparkles } from '../components/Coin';
import { BackIcon, MuteIcon, PeopleIcon, SoundIcon } from '../components/Icons';
import { PeopleSheet } from '../components/PeopleSheet';
import { SeatedScene } from '../components/SeatedScene';
import { SeatPicker } from '../components/SeatPicker';
import { SessionSheet } from '../components/SessionSheet';
import { SoundMixer } from '../components/SoundMixer';
import { CLASSMATES } from '../data/classmates';
import { getCharacter, type CharacterId } from '../data/characters';
import type { Seat } from '../data/places';
import { MIN_REWARD_MINUTES, sessionCoins } from '../config/economy';
import { addSession, fmtMinutes, setFriction } from '../lib/sessions';
import { addThought } from '../lib/thoughts';
import { loadValue, save } from '../lib/storage';
import { completeSession } from '../lib/streak';
import { earn, markStampReady } from '../lib/wallet';
import { screenMotion } from '../lib/motion';
import { normalizeIntent } from '../lib/calendar';
import styles from './ClassroomScreen.module.css';
import { formatCountdown, type FocusMode } from '../lib/focusSession';
import type { FocusSessionController } from '../lib/useFocusSession';
import { TutorPanel } from '../components/TutorPanel';

interface Props {
  characterId: CharacterId | null;
  onExit: () => void;
  onRecords: () => void;
  initialSubject?: string;
  initialEventId?: string;
  agendaDate?: string;
  visible: boolean;
  focusTimer: FocusSessionController;
  onEnd: () => void;
  initialTutorOpen?: boolean;
  tutorMessage?: string;
}

type Phase = 'explore' | 'sitting' | 'sounds' | 'plan' | 'focus';
interface Done {
  sessionId: string;
  streak: number;
  minutes: number;
  subject: string;
  sessionCoins: number; // 집중 시간 보상(1시간 = 30코인)
  stamp: boolean; // 오늘 첫 세션이라 출석 도장이 준비됨
  step: 'reward' | 'checkin';
}

const coinsImg = `${import.meta.env.BASE_URL}assets/rewards/coins.png`;
const FRICTION = ['Easy', 'Okay', 'So-so', 'Hard', 'Very hard'];

export function ClassroomScreen({ characterId, initialSubject = '', initialEventId, agendaDate, onExit, onRecords, visible, focusTimer, onEnd, initialTutorOpen = false, tutorMessage = '' }: Props) {
  const character = getCharacter(characterId);
  const { settings, playing, start, stop } = useSoundscape();
  const [phase, setPhase] = useState<Phase>('explore');
  const [seat, setSeat] = useState<Seat | null>(null);
  const [mixerOpen, setMixerOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(initialTutorOpen);
  const [tutorRevision, setTutorRevision] = useState(0);
  const [overlayRevision, setOverlayRevision] = useState(0);
  const panelRef = useRef<HTMLElement>(null);
  const [footerHeight, setFooterHeight] = useState(0);
  const openTutor = () => { setThoughtOpen(false); setMixerOpen(false); setPeopleOpen(false); setOverlayRevision(n=>n+1); setTutorOpen(true); };

  // ── 세션 계획 ──
  const [minutes, setMinutes] = useState(() => loadValue('focusMinutes', 25));
  const [subject, setSubject] = useState(initialSubject);
  const [mode, setMode] = useState<FocusMode>('timer');

  // ── 타이머 ──
  const { session, clear } = focusTimer;
  const status = session?.status ?? 'running';
  const remaining = session?.remainingMs ?? minutes * 60_000;
  const takingBreak = session?.stage === 'break' || session?.stage === 'return';
  const [done, setDone] = useState<Done | null>(null);
  // 생각 내려놓기(C6): 타이머는 멈추지 않는다
  const [thoughtOpen, setThoughtOpen] = useState(false);
  const [thought, setThought] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const thoughtRef = useRef<HTMLInputElement>(null);
  const thoughtBox = useRef<HTMLDivElement>(null);

  // iOS 키보드: visualViewport로 보이는 영역을 재서 창이 키보드 위에 남도록(창이 열려 있을 때만)
  useEffect(() => {
    const vv = window.visualViewport;
    const el = thoughtBox.current;
    if (!thoughtOpen || !vv || !el) return;
    const update = () => {
      el.style.setProperty('--vv-top', `${vv.offsetTop}px`);
      el.style.setProperty('--vv-h', `${vv.height}px`);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, [thoughtOpen]);

  useEffect(() => {
    if (!thoughtOpen) return;
    const id = window.setTimeout(() => thoughtRef.current?.focus({ preventScroll: true }), 220);
    return () => window.clearTimeout(id);
  }, [thoughtOpen]);

  const saveThought = () => {
    if (!thought.trim()) return;
    addThought(thought, `Classroom · ${subject || 'Focus'}`);
    setThought('');
    setThoughtOpen(false);
    setToast('Saved to Library');
    window.setTimeout(() => setToast(null), 2000);
  };

  // 세션 저장: 실제로 집중한 분만 기록(중간에 끝내도 남김), 오늘 첫 세션이면 하루 코인 지급
  const finish = useCallback(
    (focusedMs: number) => {
      const mins = Math.max(1, Math.round(focusedMs / 60_000));
      setThoughtOpen(false);
      const label = subject || 'Focus';
      const session = addSession({ subject: label, minutes: mins, seat: seat?.id ?? '' });
      soundscape.chime();
      // 코인: 집중 시간 보상 + 오늘 첫 세션이면 하루 선물
      const earned = sessionCoins(mins);
      if (earned) earn(earned);
      setDone({ sessionId: session.id, streak: completeSession().count, minutes: mins, subject: label, sessionCoins: earned, stamp: markStampReady(), step: 'reward' });
      setPhase('plan');
    },
    [subject, seat],
  );

  useEffect(() => {
    if (session?.stage !== 'complete') return;
    setTutorOpen(false);setTutorRevision(n=>n+1);
    if (session.focusedMs >= 10_000) finish(session.focusedMs);
    else { setThoughtOpen(false); setPhase('plan'); }
    clear();
  }, [session, finish, clear]);

  useEffect(() => { if(!visible) setTutorOpen(false); }, [visible]);
  useEffect(() => {
    const panel=panelRef.current;
    if(!panel || phase!=='focus' || done) {setFooterHeight(0);return;}
    const update=()=>setFooterHeight(panel.offsetHeight + 24);
    update();
    const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(update);
    observer?.observe(panel);window.addEventListener('resize',update);
    return()=>{observer?.disconnect();window.removeEventListener('resize',update);};
  }, [phase, done, takingBreak]);

  useEffect(() => {
    if (!visible || takingBreak) { stop(); setThoughtOpen(false); setMixerOpen(false); setPeopleOpen(false); }
    else if (session?.stage === 'focus') void start();
  }, [visible, session?.stage]);

  useEffect(() => {
    if (session?.stage === 'break' || session?.stage === 'return') soundscape.chime();
  }, [session?.stage]);

  // 화면을 떠나면 소리 정지
  useEffect(() => () => soundscape.stop(), []);
  const sittingTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(sittingTimer.current), []);

  // 앉는 탭(사용자 제스처) 안에서 오디오를 열어 두고, 카메라 이동이 끝나면 소리 설정을 띄움
  const sit = (s: Seat) => {
    setSeat(s);
    setPhase('sitting');
    void start();
    sittingTimer.current = window.setTimeout(() => setPhase('sounds'), 1900);
  };

  const startFocus = async () => {
    const intent = normalizeIntent(subject);
    if (!intent) return;
    setSubject(intent.text);
    save('focusMinutes', minutes);
    focusTimer.start(mode, minutes, intent.text);
    setPhase('focus');
    if (!playing) await start();
  };

  const toggleSound = async (id: SoundId) => {
    const on = !settings.sounds[id].on;
    soundscape.setSound(id, { on });
    if (on && !playing) await start();
  };

  // 전체 음소거: 채널별 설정은 그대로 두고 master만 0으로. 다시 켜면 이전 음량으로 복원
  const lastMaster = useRef(settings.master || 0.8);
  const muted = settings.master === 0;
  const toggleMute = async () => {
    if (muted) {
      soundscape.setMaster(lastMaster.current);
      if (!playing) await start();
    } else {
      lastMaster.current = settings.master;
      soundscape.setMaster(0);
    }
  };

  const progress = 1 - remaining / (takingBreak ? 5 * 60_000 : session?.focusDurationMs ?? minutes * 60_000);
  const seated = phase !== 'explore';
  const focusing = phase === 'focus' && !takingBreak && status === 'running';

  return (
    <motion.main className={`screen ${styles.room}`} style={{ display: visible ? undefined : 'none' }} aria-hidden={!visible || undefined} {...screenMotion}>
      <AnimatePresence initial={false}>
        {seated && seat ? (
          <motion.div key="seated" className={styles.layer} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
            <SeatedScene
              character={character}
              side={seat.side}
              focusing={focusing}
              raised={phase === 'sounds' || phase === 'plan' || mixerOpen || peopleOpen}
              soundOn={(id) => playing && settings.sounds[id].on}
              onToggleSound={toggleSound}
              mySubject={takingBreak ? 'On a break' : subject}
              onPeople={() => setPeopleOpen(true)}
            />
          </motion.div>
        ) : (
          <motion.div key="explore" className={styles.layer} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
            <SeatPicker character={character} onSit={sit} onPeople={() => setPeopleOpen(true)} movementAction={<button type="button" className={`${styles.tutorButton} ${styles.tutorInControls}`} onClick={openTutor}>Tutor</button>} />
          </motion.div>
        )}
      </AnimatePresence>

      <header className={styles.top}>
        <button type="button" className="icon-btn" onClick={onExit} aria-label="Leave classroom">
          <BackIcon />
        </button>
        {seated && seat ? (
          <button type="button" className={styles.chip} onClick={() => setPhase('explore')} disabled={phase === 'focus'} aria-label={`Seat ${seat.id}. Change seat`}>
            Seat {seat.id} <span>· Change</span>
          </button>
        ) : (
          <span className={styles.chip}>Classroom</span>
        )}
        <div className={styles.topRight}>
          <button type="button" className={`icon-btn ${styles.people}`} onClick={() => setPeopleOpen(true)} aria-label={`${CLASSMATES.length + 1} people in this room. See who`}>
            <PeopleIcon />
            <b>{CLASSMATES.length + 1}</b>
          </button>
          {seated && (
            <button type="button" className={`icon-btn ${playing && !muted ? styles.soundLive : ''}`} onClick={toggleMute} aria-pressed={muted} aria-label={muted ? 'Unmute all sound' : 'Mute all sound'}>
              {muted ? <MuteIcon /> : <SoundIcon />}
            </button>
          )}
        </div>
      </header>

      {phase === 'focus' && <div className={styles.intentBadge} aria-label={`Session goal: ${subject}`}>
        <span>MY ONE THING</span>
        <b>{subject}</b>
      </div>}

      {/* 집중 중 HUD: 미니맵·소리 아이콘·데모 채팅 */}
      {phase === 'focus' && seat && !done && !takingBreak && (
        <ClassroomHud dimmed={thoughtOpen || tutorOpen} seat={seat} footerHeight={footerHeight} overlayRevision={overlayRevision} onTutor={openTutor} soundOn={(id) => playing && !muted && settings.sounds[id].on} onToggleSound={toggleSound} onMixer={() => setMixerOpen(true)} raised />
      )}

      {/* 집중 중: 남은 시간 + 지금 하는 것 */}
      <AnimatePresence>
        {phase === 'focus' && (
          <motion.section ref={panelRef} className={`${styles.panel} ${thoughtOpen ? styles.dimmed : ''}`} inert={thoughtOpen || tutorOpen} aria-hidden={thoughtOpen || tutorOpen || undefined} aria-label="Focus timer" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}>
            <div className={styles.timerRow}>
              <div className={styles.ring} style={{ ['--p' as string]: progress }}>
                <span className={styles.time}>{formatCountdown(remaining)}</span>
              </div>
              <div className={styles.timerSide}>
                <span className={styles.nowLabel}>{takingBreak ? 'Pomodoro · break time' : status === 'running' ? (mode === 'pomodoro' ? `Pomodoro · round ${(session?.rounds ?? 0) + 1}` : 'Now focusing on') : 'Paused'}</span>
                <p className={styles.state}>{subject || 'Just focus'}</p>
                {!takingBreak && <button type="button" className={styles.with} onClick={() => setPeopleOpen(true)}>
                  with {CLASSMATES.length} Cloudees ›
                </button>}
                {takingBreak && <p className={styles.hint}>Your seat stays yours. Wander while the break timer keeps running.</p>}
              </div>
            </div>
            <div className={styles.actions}>
              <button type="button" className={`pill pill-soft ${styles.end}`} onClick={onEnd}>
                End
              </button>
              {!takingBreak && <button type="button" className={`pill pill-soft ${styles.end}`} onClick={() => setThoughtOpen(true)} aria-label="Park a thought in the Library">
                Note
              </button>}
              {takingBreak ? <button type="button" className="pill pill-primary" onClick={onExit}>Explore spaces</button> : <button type="button" className="pill pill-primary" onClick={focusTimer.togglePause}>
                {status === 'running' ? 'Pause' : 'Resume'}
              </button>}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ① 소리 조절 */}
      <SoundMixer
        open={phase === 'sounds'}
        title="Set the mood"
        subtitle="Everything starts quiet. Tap a sound to add it."
        doneLabel="Next"
        onClose={() => setPhase('plan')}
        playing={playing}
        onPlay={start}
        onStop={stop}
      />
      {/* ② 시간 + 무엇을 공부할지 */}
      <SessionSheet open={phase === 'plan' && !done && !peopleOpen && !mixerOpen && !tutorOpen} mode={mode} onMode={setMode} onClose={() => setPhase('explore')} minutes={minutes} subject={subject} initialEventId={initialEventId} agendaDate={agendaDate} onMinutes={setMinutes} onSubject={setSubject} onStart={startFocus} />

      {!done && phase !== 'explore' && (phase !== 'focus' || takingBreak) && <button type="button" className={styles.tutorButton} style={takingBreak && footerHeight ? {bottom:footerHeight+12}:undefined} onClick={openTutor}>Tutor</button>}
      <TutorPanel open={tutorOpen && visible && !done} onClose={()=>setTutorOpen(false)} goal={subject} session={session} onPause={focusTimer.togglePause} resetRevision={tutorRevision} initialMessage={tutorMessage}/>

      <SoundMixer open={mixerOpen} onClose={() => setMixerOpen(false)} playing={playing} onPlay={start} onStop={stop} />
      <PeopleSheet open={peopleOpen} onClose={() => setPeopleOpen(false)} me={character} mySubject={phase === 'focus' ? subject : undefined} />

      <AnimatePresence>
        {(phase === 'sitting' || toast) && (
          <motion.p key={toast ?? 'sit'} className={styles.toast} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {toast ?? 'Taking a seat…'}
          </motion.p>
        )}
      </AnimatePresence>

      {/* C6 생각 내려놓기 */}
      <AnimatePresence>
        {thoughtOpen && (
          <motion.div ref={thoughtBox} className={styles.thoughtBackdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setThoughtOpen(false)}>
            <motion.div
              className={styles.thoughtCard}
              role="dialog"
              aria-modal="true"
              aria-label="Park a thought"
              initial={{ y: -16, opacity: 0 }}
              animate={{ y: 0, opacity: 1, transition: { duration: 0.22 } }}
              exit={{ y: -10, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2>Park a thought</h2>
              <p>One line goes to your Library. The timer keeps running.</p>
              <input
                ref={thoughtRef}
                className={styles.thoughtInput}
                maxLength={80}
                value={thought}
                placeholder="e.g. Email the professor later"
                enterKeyHint="done"
                onChange={(e) => setThought(e.target.value)}
                onKeyDown={(e) => {
                  // 한글·베트남어 IME 조합 중의 Enter는 글자 확정이므로 저장하지 않는다
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) saveThought();
                }}
              />
              <button type="button" className="pill pill-primary" onClick={saveThought} disabled={!thought.trim()}>
                Save to Library
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* C8 보상 → C9 한 번 탭 체크인 */}
      <AnimatePresence>
        {done && (
          <motion.div className={styles.doneBackdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              key={done.step}
              className={styles.doneCard}
              role="dialog"
              aria-modal="true"
              aria-labelledby="done-title"
              initial={{ y: 40, scale: 0.95 }}
              animate={{ y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 22 } }}
              exit={{ y: 20, opacity: 0 }}
            >
              {done.step === 'reward' ? (
                <>
                  <div className={styles.coinPile}>
                    <motion.img src={coinsImg} alt="" initial={{ scale: 0, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 12, delay: 0.15 }} />
                    <Sparkles count={12} />
                  </div>
                  {done.sessionCoins > 0 ? (
                    <h2 id="done-title">
                      You earned{' '}
                      <em>
                        <CountUp value={done.sessionCoins} duration={1} /> coins!
                      </em>
                    </h2>
                  ) : (
                    <h2 id="done-title">Session saved</h2>
                  )}
                  <p>
                    For studying <b>{fmtMinutes(done.minutes)}</b> of <b>{done.subject}</b>.
                  </p>
                  <div className={styles.doneStats}>
                    {done.sessionCoins > 0 && (
                      <span>
                        <b>+{done.sessionCoins}</b> focus time
                      </span>
                    )}
                    {done.stamp && (
                      <span>
                        <b>★</b> today’s stamp is ready · claim it in the Shop
                      </span>
                    )}
                    <span>
                      <b>{done.streak}</b>-day streak
                    </span>
                  </div>
                  {done.sessionCoins === 0 && (
                    <small className={styles.doneHint}>
                      Sessions of {MIN_REWARD_MINUTES}+ minutes also earn focus coins (30 per hour). Your first session of the day also lights up a stamp in the Shop.
                    </small>
                  )}
                  <button type="button" className="pill pill-primary" onClick={() => setDone({ ...done, step: 'checkin' })}>
                    Continue
                  </button>
                  <button type="button" className={styles.doneLink} onClick={onExit}>
                    Back home
                  </button>
                </>
              ) : (
                <>
                  <h2 id="done-title">How hard was it to start?</h2>
                  <p>One tap. It helps you see what makes starting easier.</p>
                  <div className={styles.friction} role="radiogroup" aria-label="How hard was it to start">
                    {FRICTION.map((label, i) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => {
                          setFriction(done.sessionId, i + 1);
                          setDone(null);
                        }}
                      >
                        <b>{i + 1}</b>
                        <small>{label}</small>
                      </button>
                    ))}
                  </div>
                  <button type="button" className={styles.doneLink} onClick={() => setDone(null)}>
                    Skip
                  </button>
                  <button
                    type="button"
                    className={styles.doneLink}
                    onClick={() => {
                      setDone(null);
                      onRecords();
                    }}
                  >
                    See my records
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  );
}
