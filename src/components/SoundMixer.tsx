// Sound mixer bottom sheet: master volume + sound cards (classroom prop icons, tap to toggle, slider for volume)
// Kept small at about half the screen height so the seated character stays visible above
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { SOUNDS, type SoundId } from '../audio/soundscape';
import { useSoundscape } from '../audio/useSoundscape';
import styles from './SoundMixer.module.css';

interface Props {
  open: boolean;
  title?: string;
  subtitle?: string;
  doneLabel?: string;
  onClose: () => void;
  playing: boolean;
  onPlay: () => Promise<void>;
  onStop: () => void;
}

const base = import.meta.env.BASE_URL;
// Classroom prop image matching each sound
const ICONS: Record<SoundId, string> = {
  clock: `${base}assets/places/props/prop-clock.png`,
  pencil: `${base}assets/places/props/prop-desk.png`,
  breeze: `${base}assets/places/props/prop-bookshelf.png`, // Potted plant by the window
  hum: `${base}assets/places/props/prop-door.png`, // Air from the hallway side
};

export function SoundMixer({ open, title = 'Classroom sounds', subtitle, doneLabel = 'Done', onClose, playing, onPlay, onStop }: Props) {
  const { settings, engine } = useSoundscape();
  const drag = useDragControls();

  return (
    <AnimatePresence>
      {open && (
        <motion.div className={styles.backdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.section
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mixer-title"
            initial={{ y: '100%' }}
            animate={{ y: 0, transition: { type: 'spring', stiffness: 300, damping: 32 } }}
            exit={{ y: '100%', transition: { duration: 0.2 } }}
            // Drag-to-close only from the handle so it doesn't conflict with the sliders
            drag="y"
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => (info.offset.y > 80 || info.velocity.y > 500) && onClose()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.gripArea} onPointerDown={(e) => drag.start(e)} aria-hidden>
              <div className={styles.grip} />
            </div>
            <div className={styles.head}>
              <div>
                <h2 id="mixer-title">{title}</h2>
                {subtitle && <p className={styles.sub}>{subtitle}</p>}
              </div>
              <button type="button" className={`${styles.play} ${playing ? styles.playOn : ''}`} onClick={() => (playing ? onStop() : onPlay())}>
                {playing ? 'Pause all' : 'Play'}
              </button>
            </div>

            <label className={styles.master}>
              <span>Master</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={settings.master}
                onChange={(e) => engine.setMaster(Number(e.target.value))}
                style={{ ['--v' as string]: settings.master }}
              />
            </label>

            <ul className={styles.grid}>
              {SOUNDS.map((s) => {
                const ch = settings.sounds[s.id];
                return (
                  <li key={s.id} className={`${styles.card} ${ch.on ? styles.cardOn : ''}`}>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={ch.on}
                      className={styles.cardToggle}
                      onClick={() => engine.setSound(s.id, { on: !ch.on })}
                    >
                      <img src={ICONS[s.id]} alt="" className={styles.cardIcon} draggable={false} />
                      <span className={styles.cardText}>
                        <b>{s.label}</b>
                        <small>{ch.on ? s.hint : 'Off'}</small>
                      </span>
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={ch.vol}
                      aria-label={`${s.label} volume`}
                      onChange={(e) => engine.setSound(s.id, { vol: Number(e.target.value), on: true })}
                      style={{ ['--v' as string]: ch.on ? ch.vol : 0 }}
                    />
                  </li>
                );
              })}
            </ul>

            <button type="button" className={`pill ${doneLabel === 'Done' ? 'pill-soft' : 'pill-primary'}`} style={{ width: '100%' }} onClick={onClose}>
              {doneLabel}
            </button>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
