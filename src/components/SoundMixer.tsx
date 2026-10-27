// 사운드 믹서 바텀시트: 전체 볼륨 + 소리 카드(교실 소품 아이콘, 탭하면 켜기/끄기, 슬라이더로 볼륨)
// 앉은 캐릭터가 위로 보이도록 화면 절반 정도 높이로 작게 유지
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
// 소리마다 어울리는 교실 소품 이미지
const ICONS: Record<SoundId, string> = {
  clock: `${base}assets/places/props/prop-clock.png`,
  pencil: `${base}assets/places/props/prop-desk.png`,
  breeze: `${base}assets/places/props/prop-bookshelf.png`, // 창가 화분
  hum: `${base}assets/places/props/prop-door.png`, // 복도 쪽 공기
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
            // 슬라이더 조작과 겹치지 않게 손잡이에서만 끌어내려 닫기
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
