// Home: spin the place wheel to choose where to go. Visual order is place > character > action button > brand
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { CharacterSprite } from '../components/CharacterSprite';
import { CalendarIcon, CoinIcon, FlameIcon } from '../components/Icons';
import { LanguageButton } from '../components/LanguageButton';
import { PlaceWheel } from '../components/PlaceWheel';
import { getCharacter, type CharacterId } from '../data/characters';
import { PLACES, type Place } from '../data/places';
import { useT, useTRich } from '../i18n';
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

// Time-of-day greeting + name (e.g. "Good evening, Nier" / "Still up, Nier?")
const greeting = (h: number) => (h < 5 ? 'Still up, {name}?' : h < 12 ? 'Good morning, {name}' : h < 18 ? 'Good afternoon, {name}' : 'Good evening, {name}');

export function HomeScreen({ characterId, onGo, onChangeCharacter, onRecords, onMembership, onCalendar, onSoundSettings }: Props) {
  const wallet = useWallet();
  const t = useT();
  const tRich = useTRich();
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

  // "Going to …" while the wheel spins or after departing
  // Hint about friends in that space (without revealing too much)
  const here = getCompanions(character.id).filter((c) => c.space === place.id);
  const presence = here.length === 1 ? t('{name} is here', { name: here[0].name }) : here.length > 1 ? t('{n} friends here', { n: here.length }) : null;

  const status = going || walking ? t('Going to {place}…', { place: t(place.name) }) : null;

  return (
    <motion.main className={`screen ${styles.home}`} {...screenMotion}>
      <div className={styles.sun} aria-hidden />
      <span className={`${styles.cloud} ${styles.c1}`} aria-hidden />
      <span className={`${styles.cloud} ${styles.c2}`} aria-hidden />
      {[{ x: 12, y: 30 }, { x: 86, y: 24 }, { x: 70, y: 38 }].map((st, i) => (
        <motion.i key={i} className={styles.star} style={{ left: `${st.x}%`, top: `${st.y}%` }} animate={{ opacity: [0.25, 0.9, 0.25], scale: [0.7, 1, 0.7] }} transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.7 }} aria-hidden />
      ))}

      <header className={styles.header}>
        <button type="button" className={styles.hello} onClick={onChangeCharacter} aria-label={t('Studying as {name}. Change character', { name: character.name })}>
          <span className={styles.avatar} aria-hidden>
            <CharacterSprite character={character} pose="front" className={styles.avatarSprite} style={{ height: '250%' }} />
          </span>
          <span>{tRich(greeting(new Date().getHours()), { name: <b>{character.name}</b> })}</span>
        </button>
        <div className={styles.chips}>
          <LanguageButton className={styles.streak} />
          <button type="button" className={styles.streak} onClick={onMembership} aria-label={t('{n} coins. Open membership', { n: wallet.coins })}>
            <CoinIcon />
            <b>{wallet.coins}</b>
          </button>
          <button type="button" className={styles.streak} onClick={onRecords} aria-label={t('{n}-day focus streak. Open records', { n: streak.count })}>
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
        <span className={styles.eyebrow}>{t('Where to today?')}</span>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.h2 key={place.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
            {t(place.name)}
          </motion.h2>
        </AnimatePresence>
        <p className={status ? styles.going : ''}>{status ?? t(place.blurb)}</p>
        <small className={styles.presence} style={{ visibility: presence && !status ? 'visible' : 'hidden' }}>
          {presence ?? '·'}
        </small>
      </div>

      <PlaceWheel places={PLACES} character={character} index={index} onIndexChange={changeIndex} going={going} onWalkingChange={setWalking} />

      <div className={styles.dock}>
        <div className={styles.dockActions}>
          <button type="button" className="pill pill-primary" onClick={go} disabled={going}>
            {going ? t('On my way…') : t('Go to {place}', { place: t(place.name) })}
          </button>
          <button type="button" className={`pill pill-soft ${styles.calendarButton}`} onClick={onCalendar} aria-label={dueCount ? t(dueCount === 1 ? 'Open Calendar, {n} local reminder due' : 'Open Calendar, {n} local reminders due', { n: dueCount }) : t('Open Calendar')}>
            <CalendarIcon width={20} height={20} />
            <span>{t('Calendar')}</span>
            {dueCount > 0 && <i className={styles.dueDot} aria-hidden />}
          </button>
        </div>
        <p className={styles.tip}>{t('Drag the wheel or tap a place')}</p>
      </div>
    </motion.main>
  );
}
