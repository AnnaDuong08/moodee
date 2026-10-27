// 홈: 장소 휠을 돌려 갈 곳을 고른다. 시선 순서는 장소 > 캐릭터 > 행동 버튼 > 브랜드
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { CharacterSprite } from '../components/CharacterSprite';
import { CalendarIcon, CoinIcon, FlameIcon } from '../components/Icons';
import { PlaceWheel } from '../components/PlaceWheel';
import { getCharacter, type CharacterId } from '../data/characters';
import { PLACES, type Place } from '../data/places';
import { loadValue, save } from '../lib/storage';
import { screenMotion } from '../lib/motion';
import { readStreak } from '../lib/streak';
import { getCompanions } from '../lib/companions';
import { useWallet } from '../lib/wallet';
import { dueGuestPlans } from '../lib/calendar';
import styles from './HomeScreen.module.css';
import { BackgroundSoundButton } from '../components/BackgroundSound';

interface Props {
  characterId: CharacterId | null;
  onGo: (place: Place) => void;
  onChangeCharacter: () => void;
  onRecords: () => void;
  onMembership: () => void;
  onCalendar: () => void;
  onSoundSettings: () => void;
}

const logo = `${import.meta.env.BASE_URL}assets/brand/logo.png`;

// 시간대 인사 + 이름 (예: "Good evening, Nier" / "Still up, Nier?")
const greeting = (name: string) => {
  const h = new Date().getHours();
  if (h < 5) return <>Still up, <b>{name}</b>?</>;
  const word = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return <>{word}, <b>{name}</b></>;
};

export function HomeScreen({ characterId, onGo, onChangeCharacter, onRecords, onMembership, onCalendar, onSoundSettings }: Props) {
  const wallet = useWallet();
  const character = getCharacter(characterId);
  const streak = readStreak();
  const [index, setIndex] = useState(() => Math.max(0, PLACES.findIndex((p) => p.id === loadValue('lastPlace', 'classroom'))));
  const [walking, setWalking] = useState(false);
  const [going, setGoing] = useState(false);
  const [dueCount, setDueCount] = useState(() => dueGuestPlans().length);
  const place = PLACES[index];

  useEffect(() => {
    const update = () => setDueCount(dueGuestPlans().length);
    const timer = window.setInterval(update, 60_000);
    window.addEventListener('focus', update);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', update); };
  }, []);

  const changeIndex = (i: number) => {
    setIndex(i);
    save('lastPlace', PLACES[i].id);
  };

  const go = () => {
    if (going) return;
    setGoing(true);
    window.setTimeout(() => onGo(place), 1200);
  };

  // 휠이 도는 중이거나 출발했을 때 "Going to …"
  // 그 공간에 있는 친구 힌트(너무 많이 알려 주지 않는다)
  const here = getCompanions(character.id).filter((c) => c.space === place.id);
  const presence = here.length === 1 ? `${here[0].name} is here` : here.length > 1 ? `${here.length} friends here` : null;

  const status = going || walking ? `Going to ${place.name}…` : null;

  return (
    <motion.main className={`screen ${styles.home}`} {...screenMotion}>
      <div className={styles.sun} aria-hidden />
      <span className={`${styles.cloud} ${styles.c1}`} aria-hidden />
      <span className={`${styles.cloud} ${styles.c2}`} aria-hidden />
      {[{ x: 12, y: 30 }, { x: 86, y: 24 }, { x: 70, y: 38 }].map((st, i) => (
        <motion.i key={i} className={styles.star} style={{ left: `${st.x}%`, top: `${st.y}%` }} animate={{ opacity: [0.25, 0.9, 0.25], scale: [0.7, 1, 0.7] }} transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.7 }} aria-hidden />
      ))}

      <header className={styles.header}>
        <button type="button" className={styles.hello} onClick={onChangeCharacter} aria-label={`Studying as ${character.name}. Change character`}>
          <span className={styles.avatar} aria-hidden>
            <CharacterSprite character={character} pose="front" className={styles.avatarSprite} style={{ height: '250%' }} />
          </span>
          <span>{greeting(character.name)}</span>
        </button>
        <div className={styles.chips}>
          <button type="button" className={styles.streak} onClick={onMembership} aria-label={`${wallet.coins} coins. Open membership`}>
            <CoinIcon />
            <b>{wallet.coins}</b>
          </button>
          <button type="button" className={styles.streak} onClick={onRecords} aria-label={`${streak.count}-day focus streak. Open records`}>
            <FlameIcon width={18} height={18} className={streak.count ? styles.flameOn : styles.flameOff} />
            <b>{streak.count}</b>
          </button>
        </div>
      </header>

      <div className={styles.brand}>
        <h1><img src={logo} alt="MOODEE" /></h1>
        <div className={styles.sound}><BackgroundSoundButton onClick={onSoundSettings} /></div>
      </div>

      <div className={styles.info} aria-live="polite">
        <span className={styles.eyebrow}>Where to today?</span>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.h2 key={place.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
            {place.name}
          </motion.h2>
        </AnimatePresence>
        <p className={status ? styles.going : ''}>{status ?? place.blurb}</p>
        <small className={styles.presence} style={{ visibility: presence && !status ? 'visible' : 'hidden' }}>
          {presence ?? '·'}
        </small>
      </div>

      <PlaceWheel places={PLACES} character={character} index={index} onIndexChange={changeIndex} going={going} onWalkingChange={setWalking} />

      <div className={styles.dock}>
        <div className={styles.dockActions}>
          <button type="button" className="pill pill-primary" onClick={go} disabled={going}>
            {going ? 'On my way…' : `Go to ${place.name}`}
          </button>
          <button type="button" className={`pill pill-soft ${styles.calendarButton}`} onClick={onCalendar} aria-label={dueCount ? `Open Calendar, ${dueCount} local reminder${dueCount === 1 ? '' : 's'} due` : 'Open Calendar'}>
            <CalendarIcon width={20} height={20} />
            <span>Calendar</span>
            {dueCount > 0 && <i className={styles.dueDot} aria-hidden />}
          </button>
        </div>
        <p className={styles.tip}>Drag the wheel or tap a place</p>
      </div>
    </motion.main>
  );
}
