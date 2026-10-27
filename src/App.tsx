// 화면 흐름: (첫 실행) Character Select → Home(장소 휠) → Classroom 집중 루틴 / 다른 공간 둘러보기
// 홈에서 Records(주제별 시간)와 Membership(코인·보상)으로 갈 수 있다
import { AnimatePresence, MotionConfig } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { LoadingSplash, pickSplash } from './components/LoadingSplash';
import { type CharacterId } from './data/characters';
import type { Place } from './data/places';
import { loadValue, save } from './lib/storage';
import { completeGoogleRedirect } from './lib/googleConnection';
import { HomeScreen } from './screens/HomeScreen';
import { IntroScreen } from './screens/IntroScreen';
import { CafeScreen } from './screens/CafeScreen';
import { CompanionSetupScreen } from './screens/CompanionSetupScreen';
import { LibraryScreen } from './screens/LibraryScreen';
import { CharacterSelectScreen } from './screens/CharacterSelectScreen';
import { ClassroomScreen } from './screens/ClassroomScreen';
import { ShopScreen } from './screens/ShopScreen';
import { MuseumScreen } from './screens/MuseumScreen';
import { RoomScreen } from './screens/RoomScreen';
import { RecordsScreen } from './screens/RecordsScreen';
import { CalendarScreen } from './screens/CalendarScreen';
import { useFocusSession } from './lib/useFocusSession';
import { BreakTimer, SessionExitDialog } from './components/SessionOverlays';
import { exchangeOAuthSession, oauthDestination } from './lib/auth';
import { useRoomAudio } from './audio/useRoomAudio';
import { BackgroundSoundPanel } from './components/BackgroundSound';

type Screen = 'intro' | 'home' | 'companions' | 'select' | 'classroom' | 'cafe' | 'library' | 'museum' | 'my-room' | 'records' | 'membership' | 'calendar';

const SPLASH_SECONDS = 2.2;

export function App() {
  const focusTimer = useFocusSession();
  const [stopRequest, setStopRequest] = useState<'exit' | 'stop' | null>(null);
  useEffect(() => {
    if (!focusTimer.session || focusTimer.session.stage === 'complete') setStopRequest(null);
  }, [focusTimer.session?.stage]);
  const [characterId, setCharacterId] = useState<CharacterId | null>(() => loadValue<CharacterId | null>('character', null));
  const [screen, setScreen] = useState<Screen>('intro');
  useRoomAudio(screen);
  const [soundSettingsOpen, setSoundSettingsOpen] = useState(false);
  useEffect(() => setSoundSettingsOpen(false), [screen]);
  const openSoundSettings = () => setSoundSettingsOpen(true);
  // 앱을 열면 인트로 → 친구 수 → 캐릭터 고르기 순서로 한 번 지나간다
  const [onboarding, setOnboarding] = useState(true);
  // Membership에서 뒤로 갈 곳(홈 또는 둘러보던 공간)
  const [membershipFrom, setMembershipFrom] = useState<Screen>('home');
  const [classroomSuggestion, setClassroomSuggestion] = useState<{ text: string; eventId?: string; date?: string }>({ text: '' });
  const [calendarMessage, setCalendarMessage] = useState('');
  const [calendarConnectionRevision, setCalendarConnectionRevision] = useState(0);
  const [tutorMessage,setTutorMessage]=useState('');
  const [initialTutorOpen,setInitialTutorOpen]=useState(false);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const destination=query.get('oauth_destination')==='tutor' || oauthDestination()==='tutor'?'tutor':'calendar';
    const returnToTutor=(message:string)=>{setTutorMessage(message);setInitialTutorOpen(true);setOnboarding(false);setScreen('classroom');};
    if (query.has('error')) {
      setCalendarMessage(query.get('error_description')?.slice(0, 200) || 'Google connection was cancelled.');
      const errorMessage=query.get('error_description')?.slice(0,200)||'Google sign-in was cancelled.';
      query.delete('error'); query.delete('error_description');query.delete('oauth_destination');
      window.history.replaceState({}, '', `${window.location.pathname}${query.size ? `?${query}` : ''}${window.location.hash}`);
      if(destination==='tutor')returnToTutor(errorMessage);else setScreen('calendar');
      return;
    }
    if (!query.has('code')) return;
    if(destination==='tutor'){
      void exchangeOAuthSession().then(()=>returnToTutor('Google sign-in complete.')).catch(()=>returnToTutor('Google sign-in failed. Please try again.'));
      return;
    }
    void completeGoogleRedirect().then(() => {
      setCalendarMessage('Google Calendar connected.');
      setCalendarConnectionRevision((revision) => revision + 1);
      setScreen('calendar');
    }).catch((error: unknown) => {
      setCalendarMessage(error instanceof Error ? error.message : 'Could not connect Google Calendar.');
      setScreen('calendar');
    });
  }, []);

  // 로딩 화면: 앱을 열 때와 장소로 이동할 때(그림은 매번 무작위 한 장)
  const [splash, setSplash] = useState<{ image: string; label: string } | null>(null);
  const timers = useRef<number[]>([]);
  const showSplash = (label: string, then?: () => void) => {
    timers.current.forEach(clearTimeout);
    setSplash({ image: pickSplash(), label });
    timers.current = [window.setTimeout(() => then?.(), 500), window.setTimeout(() => setSplash(null), SPLASH_SECONDS * 1000)];
  };
  const chooseCharacter = (id: CharacterId) => {
    setCharacterId(id);
    save('character', id);
    setOnboarding(false);
    setScreen('home');
  };

  const openClassroom = (text = '', eventId?: string, date?: string) => {
    if (focusTimer.session) { setScreen('classroom'); return; }
    setClassroomSuggestion({ text, eventId, date });
    setScreen('classroom');
  };

  const go = (p: Place) => {
    showSplash(`Going to ${p.name}…`, () => {
      if (p.available) openClassroom();
      else setScreen(p.id as Screen);
    });
  };

  const openMembership = (from: Screen) => {
    setMembershipFrom(from);
    setScreen('membership');
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="phone">
        {/* 이전 화면이 사라지는 동안 새 화면이 겹쳐 떠오르는 크로스페이드(빈 화면 없음) */}
        <AnimatePresence initial={false}>
          {screen === 'home' && (
            <HomeScreen
              key="home"
              characterId={characterId}
              onGo={go}
              onChangeCharacter={() => setScreen('select')}
              onRecords={() => setScreen('records')}
              onMembership={() => openMembership('home')}
              onCalendar={() => setScreen('calendar')}
              onSoundSettings={openSoundSettings}
            />
          )}
          {screen === 'calendar' && (
            <CalendarScreen key="calendar" initialMessage={calendarMessage} connectionRevision={calendarConnectionRevision} onBack={() => setScreen('home')} onStart={(text, eventId, date) => openClassroom(text, eventId, date)} />
          )}
          {screen === 'companions' && <CompanionSetupScreen key="companions" onBack={onboarding ? undefined : () => setScreen('home')} onDone={() => setScreen(onboarding ? 'select' : 'home')} />}
          {screen === 'intro' && <IntroScreen key="intro" onStart={() => setScreen('companions')} />}
          {screen === 'cafe' && <CafeScreen key="cafe" characterId={characterId} onBack={() => setScreen('home')} onChangeFriends={() => setScreen('companions')} onSoundSettings={openSoundSettings} />}
          {screen === 'library' && <LibraryScreen key="library" characterId={characterId} onBack={() => setScreen('home')} onChangeFriends={() => setScreen('companions')} onSoundSettings={openSoundSettings} />}
          {screen === 'select' && (
            <CharacterSelectScreen
              key="select"
              initialId={characterId}
              onBack={onboarding ? () => setScreen('companions') : () => setScreen('home')}
              onConfirm={chooseCharacter}
            />
          )}
          {(screen === 'classroom' || focusTimer.session !== null) && (
            <ClassroomScreen key="classroom" initialTutorOpen={initialTutorOpen} tutorMessage={tutorMessage} visible={screen === 'classroom'} focusTimer={focusTimer} characterId={characterId} initialSubject={classroomSuggestion.text} initialEventId={classroomSuggestion.eventId} agendaDate={classroomSuggestion.date} onExit={() => {
              if (focusTimer.session?.stage === 'focus') setStopRequest('exit');
              else setScreen('home');
            }} onEnd={() => setStopRequest('stop')} onRecords={() => setScreen('records')} />
          )}
          {screen === 'museum' && <MuseumScreen key="museum" characterId={characterId} onBack={() => setScreen('home')} onSoundSettings={openSoundSettings} />}
          {screen === 'my-room' && (
            <RoomScreen key="my-room" characterId={characterId} onBack={() => setScreen('home')} onMembership={() => openMembership('my-room')} onChangeCharacter={(id) => (setCharacterId(id), save('character', id))} onSoundSettings={openSoundSettings} />
          )}
          {screen === 'records' && <RecordsScreen key="records" onBack={() => setScreen('home')} onStudy={() => openClassroom()} />}
          {screen === 'membership' && <ShopScreen key="membership" onBack={() => setScreen(membershipFrom)} onStudy={() => openClassroom()} />}
        </AnimatePresence>
        <AnimatePresence>{splash && <LoadingSplash key={splash.image} {...splash} duration={SPLASH_SECONDS - 0.3} />}</AnimatePresence>
        {focusTimer.session && !stopRequest && (focusTimer.session.stage === 'return' || (focusTimer.session.stage === 'break' && screen !== 'classroom')) && <BreakTimer session={focusTimer.session} onReturn={() => {
          setScreen('classroom');
          if (focusTimer.session?.stage === 'return') focusTimer.returnToFocus();
        }} onEnd={() => setStopRequest('stop')} />}
        {stopRequest && <SessionExitDialog kind={stopRequest} onCancel={() => setStopRequest(null)} onConfirm={() => {
          focusTimer.end();
          setScreen(stopRequest === 'exit' ? 'home' : 'classroom');
          setStopRequest(null);
        }} />}
        <BackgroundSoundPanel open={soundSettingsOpen} onClose={() => setSoundSettingsOpen(false)} />
      </div>
    </MotionConfig>
  );
}
